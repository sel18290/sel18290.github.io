export function validSleepAnswer(value) {
  const s=String(value).normalize('NFKC').toLowerCase().trim().replace(/\s+/g,'').replace(/heures?/g,'h').replace(/minutes?/g,'min');
  return /^(?:3h30(?:min)?|3:30|3[.,]5h|210min)(?:desommeil)?$/.test(s);
}
