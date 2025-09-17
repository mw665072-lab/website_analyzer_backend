declare module 'text-readability' {
  export function fleschKincaidGradeLevel(text: string): number;
  export function fleschReadingEase(text: string): number;
  export function gunningFogIndex(text: string): number;
  export function colemanLiauIndex(text: string): number;
  export function automatedReadabilityIndex(text: string): number;
  export function smogIndex(text: string): number;
}
