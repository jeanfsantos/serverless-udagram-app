type Stage = 'dev' | 'prod';

function isStage(value: string): value is Stage {
  return ['dev', 'prod'].includes(value);
}

export const stage = isStage(process.env.stage) ? process.env.stage : 'dev';
