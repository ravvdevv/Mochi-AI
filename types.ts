
export enum Expression {
  IDLE = 'IDLE',
  HAPPY = 'HAPPY',
  ANGRY = 'ANGRY',
  SLEEPY = 'SLEEPY',
  THINKING = 'THINKING',
  BLINK = 'BLINK',
  EVIL = 'EVIL',
  LAUGHING = 'LAUGHING',
  EVILLAUGH = 'EVILLAUGH',
  EVILLAUGH_TWITCH = 'EVILLAUGH_TWITCH',
  EVIL_RANT = 'EVIL_RANT',
  SMUG = 'SMUG',
  WINK = 'WINK',
  DISCO = 'DISCO',
  DANCE = 'DANCE',
  PLEADING = 'PLEADING',
  TONGUE_SQUINT = 'TONGUE_SQUINT',
  YUM = 'YUM',
  TONGUE_WINK = 'TONGUE_WINK'
}

export enum Mode {
  NORMAL = 'NORMAL',
  PHONK = 'PHONK',
  DISCO = 'DISCO'
}

export interface Point {
  x: number;
  y: number;
}
