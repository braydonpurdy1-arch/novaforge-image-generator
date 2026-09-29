export interface CinematicPromptInput {
  subject: string;
  camera?: string;
  lens?: string;
  blocking?: string;
  lighting?: string;
  materials?: string;
  motion?: string;
  physics?: string;
  atmosphere?: string;
  preserve?: string[];
  negative?: string[];
}

export function compileCinematicPrompt(input: CinematicPromptInput): string {
  const sections: string[] = [`SUBJECT\n${input.subject}`];
  if (input.camera) sections.push(`CAMERA\n${input.camera}`);
  if (input.lens) sections.push(`LENS\n${input.lens}`);
  if (input.blocking) sections.push(`BLOCKING\n${input.blocking}`);
  if (input.lighting) sections.push(`LIGHTING\n${input.lighting}`);
  if (input.materials) sections.push(`MATERIALS\n${input.materials}`);
  if (input.motion) sections.push(`MOTION\n${input.motion}`);
  if (input.physics) sections.push(`PHYSICS\n${input.physics}`);
  if (input.atmosphere) sections.push(`ATMOSPHERE\n${input.atmosphere}`);
  if (input.preserve?.length) sections.push(`MUST PRESERVE\n${input.preserve.join(", ")}`);
  if (input.negative?.length) sections.push(`NEGATIVE CONSTRAINTS\n${input.negative.join(", ")}`);
  return sections.join("\n\n");
}
