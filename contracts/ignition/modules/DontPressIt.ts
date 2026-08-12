import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DontPressItModule = buildModule(
  "DontPressItModule",
  (m) => {
    const game = m.contract("DontPressIt");

    return { game };
  }
);

export default DontPressItModule;
