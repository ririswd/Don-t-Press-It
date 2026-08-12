// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    e,
    ebool,
    euint256,
    inco
} from "@inco/lightning/src/Lib.sol";

import {
    DecryptionAttestation
} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

contract DontPressIt {
    using e for *;

    uint256 public nextRoomId = 1;
    uint64 public constant ROUND_DURATION = 10 minutes;

    struct Room {
        address host;
        address[4] players;

        uint8 playerCount;
        uint8 maxPlayers;

        uint32 round;
        uint8 submittedCount;
        uint64 roundDeadline;

        uint256 pot;

        bool started;
        bool revealReady;
        bool roundFinalized;
        bool ended;

        address winner;

        euint256 pressCount;
        euint256 weightedPressers;
        euint256 winnerIndex;
    }

    mapping(uint256 => Room) private rooms;

    mapping(uint256 => mapping(address => bool)) public isPlayer;
    mapping(uint256 => mapping(address => uint8)) public playerIndex;
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    mapping(uint256 => mapping(address => ebool)) private choices;

    event RoomCreated(
        uint256 indexed roomId,
        address indexed host,
        uint8 maxPlayers
    );

    event PlayerJoined(
        uint256 indexed roomId,
        address indexed player,
        uint8 playerCount
    );

    event GameStarted(
        uint256 indexed roomId
    );

    event ChoiceSubmitted(
        uint256 indexed roomId,
        address indexed player,
        uint32 round
    );

    event RevealReady(
        uint256 indexed roomId,
        uint32 round,
        bytes32 pressCountHandle,
        bytes32 winnerIndexHandle
    );

    event RoundFinalized(
        uint256 indexed roomId,
        uint32 round,
        uint256 pressCount,
        address winner,
        uint256 pot
    );

    event NextRound(
        uint256 indexed roomId,
        uint32 round,
        uint256 pot
    );

    event RoundExpired(
        uint256 indexed roomId,
        uint32 round
    );

    // --------------------------------------------------
    // CREATE ROOM
    // --------------------------------------------------

    function createRoom(uint8 maxPlayers)
        external
        returns (uint256 roomId)
    {
        require(
            maxPlayers >= 2 && maxPlayers <= 4,
            "Room must have 2-4 players"
        );

        roomId = nextRoomId++;

        Room storage room = rooms[roomId];

        room.host = msg.sender;
        room.maxPlayers = maxPlayers;

        room.players[0] = msg.sender;
        room.playerCount = 1;

        room.pot = 1000;

        isPlayer[roomId][msg.sender] = true;
        playerIndex[roomId][msg.sender] = 1;

        emit RoomCreated(
            roomId,
            msg.sender,
            maxPlayers
        );
    }

    // --------------------------------------------------
    // JOIN ROOM
    // --------------------------------------------------

    function joinRoom(uint256 roomId) external {
        Room storage room = rooms[roomId];

        require(room.host != address(0), "Room does not exist");
        require(!room.started, "Game already started");
        require(!isPlayer[roomId][msg.sender], "Already joined");
        require(
            room.playerCount < room.maxPlayers,
            "Room is full"
        );

        uint8 index = room.playerCount;

        room.players[index] = msg.sender;
        room.playerCount++;

        isPlayer[roomId][msg.sender] = true;

        // Index is 1-4 rather than 0-3.
        playerIndex[roomId][msg.sender] =
            room.playerCount;

        emit PlayerJoined(
            roomId,
            msg.sender,
            room.playerCount
        );
    }

    // --------------------------------------------------
    // START GAME
    // --------------------------------------------------

    function startGame(uint256 roomId) external {
        Room storage room = rooms[roomId];

        require(msg.sender == room.host, "Only host");
        require(!room.started, "Already started");
        require(room.playerCount >= 2, "Need at least 2 players");

        room.started = true;
        room.round = 1;
        room.roundDeadline = uint64(block.timestamp + ROUND_DURATION);

        emit GameStarted(roomId);
    }

    // --------------------------------------------------
    // SECRET CHOICE
    //
    // false = DON'T PRESS
    // true  = PRESS IT
    // --------------------------------------------------

    function submitChoice(
        uint256 roomId,
        bytes calldata encryptedChoice
    ) external payable {
        Room storage room = rooms[roomId];

        require(room.started, "Game not started");
        require(!room.ended, "Game ended");
        require(!room.roundFinalized, "Round already finished");

        require(
            isPlayer[roomId][msg.sender],
            "Not a player"
        );

        require(
            !hasSubmitted[roomId][msg.sender],
            "Already submitted"
        );

        // One encrypted input is being consumed.
        require(
            msg.value >= inco.getFee(),
            "Inco fee not paid"
        );

        ebool choice =
            e.newEbool(encryptedChoice, msg.sender);

        // Contract needs permission to keep using this
        // encrypted value in future transactions.
        choice.allowThis();

        choices[roomId][msg.sender] = choice;

        euint256 numericChoice =
            e.asEuint256(choice);

        uint256 index =
            uint256(playerIndex[roomId][msg.sender]);

        euint256 weighted =
            e.mul(numericChoice, index);

        if (room.submittedCount == 0) {
            room.pressCount = numericChoice;
            room.weightedPressers = weighted;
        } else {
            room.pressCount =
                e.add(room.pressCount, numericChoice);

            room.weightedPressers =
                e.add(room.weightedPressers, weighted);
        }

        room.pressCount.allowThis();
        room.weightedPressers.allowThis();

        hasSubmitted[roomId][msg.sender] = true;
        room.submittedCount++;

        emit ChoiceSubmitted(
            roomId,
            msg.sender,
            room.round
        );

        // Everyone has made their secret choice.
        if (room.submittedCount == room.playerCount) {
            ebool exactlyOnePressed =
                e.eq(room.pressCount, uint256(1));

            /*
                If exactly one pressed:

                choice1 * 1 +
                choice2 * 2 +
                choice3 * 3 +
                choice4 * 4

                gives us that player's index.

                Otherwise winner index = 0.
            */

            room.winnerIndex = e.select(
                exactlyOnePressed,
                room.weightedPressers,
                e.asEuint256(0)
            );

            room.winnerIndex.allowThis();

            // Choices stay private UNTIL this point.
            for (uint256 i = 0; i < room.playerCount; i++) {
                choices[roomId][room.players[i]].reveal();
            }

            room.pressCount.reveal();
            room.winnerIndex.reveal();

            room.revealReady = true;

            emit RevealReady(
                roomId,
                room.round,
                euint256.unwrap(room.pressCount),
                euint256.unwrap(room.winnerIndex)
            );
        }
    }

    // --------------------------------------------------
    // FINALIZE AFTER INCO REVEAL
    // --------------------------------------------------

    function finalizeRound(
        uint256 roomId,
        DecryptionAttestation calldata pressCountAttestation,
        bytes[] calldata pressCountSignatures,
        DecryptionAttestation calldata winnerAttestation,
        bytes[] calldata winnerSignatures
    ) external {
        Room storage room = rooms[roomId];

        require(room.revealReady, "Reveal not ready");
        require(!room.roundFinalized, "Already finalized");

        require(
            inco.incoVerifier().isValidDecryptionAttestation(
                pressCountAttestation,
                pressCountSignatures
            ),
            "Invalid press count attestation"
        );

        require(
            pressCountAttestation.handle ==
                euint256.unwrap(room.pressCount),
            "Wrong press count handle"
        );

        require(
            inco.incoVerifier().isValidDecryptionAttestation(
                winnerAttestation,
                winnerSignatures
            ),
            "Invalid winner attestation"
        );

        require(
            winnerAttestation.handle ==
                euint256.unwrap(room.winnerIndex),
            "Wrong winner handle"
        );

        uint256 numberOfPressers =
            uint256(pressCountAttestation.value);

        uint256 winningIndex =
            uint256(winnerAttestation.value);

        if (numberOfPressers == 0) {
            // Nobody pressed.
            room.pot += 500;
        } else if (numberOfPressers == 1) {
            require(
                winningIndex >= 1 &&
                winningIndex <= room.playerCount,
                "Invalid winner"
            );

            room.winner =
                room.players[winningIndex - 1];

            room.ended = true;
        }

        // If 2+ pressed:
        // nobody wins and pot stays the same.

        room.roundFinalized = true;

        emit RoundFinalized(
            roomId,
            room.round,
            numberOfPressers,
            room.winner,
            room.pot
        );
    }

    // --------------------------------------------------
    // NEXT ROUND
    // --------------------------------------------------

    function nextRound(uint256 roomId) external {
        Room storage room = rooms[roomId];

        require(room.roundFinalized, "Finish current round");
        require(!room.ended, "Game already ended");

        for (uint256 i = 0; i < room.playerCount; i++) {
            address player = room.players[i];

            hasSubmitted[roomId][player] = false;
        }

        room.round++;
        room.submittedCount = 0;
        room.roundDeadline = uint64(block.timestamp + ROUND_DURATION);

        room.revealReady = false;
        room.roundFinalized = false;

        room.pressCount =
            euint256.wrap(bytes32(0));

        room.weightedPressers =
            euint256.wrap(bytes32(0));

        room.winnerIndex =
            euint256.wrap(bytes32(0));

        emit NextRound(
            roomId,
            room.round,
            room.pot
        );
    }

    // --------------------------------------------------
    // TIMEOUT
    // --------------------------------------------------

    /// @notice Lets anyone unblock a room when a player never submits a choice.
    /// Submitted choices remain encrypted and are never revealed for an expired round.
    function expireRound(uint256 roomId) external {
        Room storage room = rooms[roomId];

        require(room.started, "Game not started");
        require(!room.ended, "Game ended");
        require(!room.roundFinalized, "Round already finished");
        require(!room.revealReady, "Reveal in progress");
        require(block.timestamp >= room.roundDeadline, "Round still active");

        room.roundFinalized = true;

        emit RoundExpired(roomId, room.round);
    }

    // --------------------------------------------------
    // READ ROOM
    // --------------------------------------------------

    function getRoom(uint256 roomId)
        external
        view
        returns (
            address host,
            address[4] memory players,
            uint8 playerCount_,
            uint8 maxPlayers_,
            uint32 round_,
            uint8 submittedCount_,
            uint256 pot_,
            bool started_,
            bool revealReady_,
            bool roundFinalized_,
            bool ended_,
            address winner_
        )
    {
        Room storage room = rooms[roomId];

        return (
            room.host,
            room.players,
            room.playerCount,
            room.maxPlayers,
            room.round,
            room.submittedCount,
            room.pot,
            room.started,
            room.revealReady,
            room.roundFinalized,
            room.ended,
            room.winner
        );
    }

    function getRoundDeadline(uint256 roomId) external view returns (uint64) {
        return rooms[roomId].roundDeadline;
    }

    function getRoundHandles(uint256 roomId)
        external
        view
        returns (
            bytes32 pressCountHandle,
            bytes32 winnerIndexHandle
        )
    {
        Room storage room = rooms[roomId];

        return (
            euint256.unwrap(room.pressCount),
            euint256.unwrap(room.winnerIndex)
        );
    }

    function getChoiceHandle(
        uint256 roomId,
        address player
    )
        external
        view
        returns (bytes32)
    {
        require(
            roomExists(roomId),
            "Room does not exist"
        );

        return ebool.unwrap(
            choices[roomId][player]
        );
    }

    function roomExists(uint256 roomId)
        public
        view
        returns (bool)
    {
        return rooms[roomId].host != address(0);
    }
}
