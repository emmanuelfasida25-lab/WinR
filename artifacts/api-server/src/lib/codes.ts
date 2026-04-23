const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1

function rand(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}

export function generateReferralCode(): string {
  return rand(7);
}

export function generateReferenceCode(): string {
  return "WINR-" + rand(8);
}
