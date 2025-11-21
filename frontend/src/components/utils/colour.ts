export type rgbColour = { r: number; g: number; b: number };
export function mixColourRandomly(start: rgbColour) {
  let red = Math.floor(Math.random() * 256);
  let green = Math.floor(Math.random() * 256);
  let blue = Math.floor(Math.random() * 256);

  red = (4 * red + 6 * start.r) / 10;
  green = (4 * green + 6 * start.g) / 10;
  blue = (4 * blue + 6 * start.b) / 10;

  return { r: red, g: green, b: blue };
}

export function generateRandomColours() {
  const bg = mixColourRandomly({ r: 255, g: 255, b: 255 });
  const text = mixColourRandomly({ r: 10, g: 10, b: 10 });
  const line = mixColourRandomly({ r: 52, g: 158, b: 239 });

  return {
    bg: `rgba(${bg.r}, ${bg.g}, ${bg.b}, 0.7)`,
    text: `rgb(${text.r}, ${text.g}, ${text.b})`,
    line: `rgb(${line.r}, ${line.g}, ${line.b})`,
  };
}
