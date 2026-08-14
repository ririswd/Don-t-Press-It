import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error("OPENROUTER_API_KEY is required");

const repoRoot = process.cwd();
const outputDirectory = path.join(repoRoot, "frontend/public/candy");
const downloads = "/Users/kevincharm/Downloads";

const jobs = {
  backdrop: {
    filename: "candy-backdrop.jpg",
    aspectRatio: "16:9",
    references: [
      "ChatGPT_Image_Aug_14_2026_11_12_31_PM_1.png",
      "ChatGPT_Image_Aug_14_2026_11_12_31_PM_3.png",
    ],
    prompt: `Create a clean implementation-ready 16:9 game background using the exact visual language of the reference images: dreamy pale blush-pink scrapbook paper, extremely subtle pearlescent grain, tiny white four-point sparkles, faint stitched heart outlines, and torn lavender-and-white gingham paper peeking in only from the two lower corners. Keep the central 82% of the canvas quiet and open for live HTML interface panels. No logo, no words, no letters, no numbers, no buttons, no UI panels, no phone, no people, no characters. Soft studio lighting, glossy kawaii Y2K craft aesthetic, polished but low-contrast enough for readable UI.`,
  },
  logo: {
    filename: "candy-logo.jpg",
    aspectRatio: "3:2",
    references: [
      "ChatGPT_Image_Aug_14_2026_11_12_31_PM_1.png",
      "ChatGPT_Image_Aug_14_2026_11_12_31_PM_4.png",
    ],
    prompt: `Generate one isolated reusable game title mark matching the reference exactly in spirit. The only text must read “DON’T PRESS IT” with DON’T as glossy hot-pink inflated jelly lettering and PRESS IT as glossy lavender-purple inflated jelly lettering. Add a large translucent pink satin bow at the upper left with a faceted ruby heart gem in its knot, a small faceted pink heart gem at upper right, and one tiny lavender star sticker. Thick cream-white sticker outline, convincing candy-plastic highlights and soft drop shadow. Center the complete mark with generous empty margin. Put it on one perfectly uniform pale blush-pink background (#F8CBD8) with no texture, no gradient, no checkerboard, no transparency pattern, and no horizon. No extra words, no tagline, no other objects. Ensure spelling and apostrophe are correct.`,
  },
  phone: {
    filename: "candy-phone.jpg",
    aspectRatio: "3:4",
    references: [
      "ChatGPT_Image_Aug_14_2026_11_12_31_PM_1.png",
      "ChatGPT_Image_Aug_14_2026_11_12_31_PM_6.png",
    ],
    prompt: `Create one isolated decorative Y2K pink flip phone charm matching the references. Three-quarter view, open clamshell, translucent glossy bubblegum-pink plastic, lavender keypad, purple heart-shaped center button, tiny faceted ruby heart above a blank lavender LCD, beaded pink-and-purple wrist strap, silver chain, dangling clear faceted pink heart charm and tiny silver star. The LCD may contain only a tiny pixel heart, absolutely no readable words or numbers. Soft candy highlights and realistic soft shadow. Entire object visible and centered. Put it on one perfectly uniform pale blush-pink background (#F8CBD8) with no texture, no gradient, no checkerboard, no transparency pattern, and no horizon. No scene and no additional props.`,
  },
  angel: {
    filename: "choice-angel.jpg",
    aspectRatio: "1:1",
    references: ["ChatGPT_Image_Aug_14_2026_11_12_31_PM_5.png"],
    prompt: `Create a single isolated large angelic choice-button plate based on the left choice in the reference. A glossy mint-green circular candy-plastic button mounted on a softly squared mint base, small white angel wings on both sides, a gold halo above, tiny cream stars, faceted pink heart gem near the bottom. Keep the entire circular center empty and visually calm so live HTML text can be overlaid; no words, letters, numbers, or symbols in the center. Front-facing with subtle perspective, thick cream rim, bright specular highlights and soft drop shadow. Put it on one perfectly uniform pale blush-pink background (#F8CBD8) with no texture, no gradient, no checkerboard, no transparency pattern, and no horizon. No other objects.`,
  },
  devil: {
    filename: "choice-devil.jpg",
    aspectRatio: "1:1",
    references: ["ChatGPT_Image_Aug_14_2026_11_12_31_PM_5.png"],
    prompt: `Create a single isolated large mischievous choice-button plate based on the right choice in the reference. A glossy saturated pink circular candy-plastic button mounted on a softly squared rose-pink base, two small dark-pink devil horns at the top, a curled devil tail with arrow tip around the lower right, tiny pink star stickers, faceted ruby heart gem near the bottom. Keep the entire circular center empty and visually calm so live HTML text can be overlaid; no words, letters, numbers, or symbols in the center. Front-facing with subtle perspective, thick cream rim, bright specular highlights and soft drop shadow. Put it on one perfectly uniform pale blush-pink background (#F8CBD8) with no texture, no gradient, no checkerboard, no transparency pattern, and no horizon. No other objects.`,
  },
};

const requested = process.argv.slice(2);
const selectedJobs = requested.length ? requested : Object.keys(jobs);

await mkdir(outputDirectory, { recursive: true });

async function dataUrl(filename) {
  const image = await readFile(path.join(downloads, filename));
  return `data:image/png;base64,${image.toString("base64")}`;
}

for (const name of selectedJobs) {
  const job = jobs[name];
  if (!job) throw new Error(`Unknown asset job: ${name}`);

  const inputReferences = await Promise.all(
    job.references.map(async (filename) => ({
      type: "image_url",
      image_url: { url: await dataUrl(filename) },
    })),
  );

  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://dont-press-it.invalid",
      "X-Title": "Don't Press It visual asset generation",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      prompt: job.prompt,
      n: 1,
      resolution: "2K",
      aspect_ratio: job.aspectRatio,
      input_references: inputReferences,
      provider: {
        order: ["google-ai-studio", "google-vertex/global"],
        allow_fallbacks: true,
      },
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.data?.[0]?.b64_json) {
    throw new Error(`${name} generation failed (${response.status}): ${JSON.stringify(result)}`);
  }

  const outputPath = path.join(outputDirectory, job.filename);
  await writeFile(outputPath, Buffer.from(result.data[0].b64_json, "base64"));
  console.log(`${name}: ${outputPath} (${result.data[0].media_type ?? "unknown"}, $${result.usage?.cost ?? "?"})`);
}
