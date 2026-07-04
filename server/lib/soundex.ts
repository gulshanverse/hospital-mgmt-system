export function soundex(str: string): string {
  if (!str) return "";
  const s = str.toUpperCase().replace(/[^A-Z]/g, "");
  if (s.length === 0) return "";
  
  const first = s[0];
  const mappings: Record<string, string> = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6"
  };
  
  let code = first;
  let prevVal = mappings[first] || "";
  
  for (let i = 1; i < s.length; i++) {
    const char = s[i];
    if (char === 'H' || char === 'W') continue;
    const val = mappings[char] || "";
    if (val && val !== prevVal) {
      code += val;
      prevVal = val;
    } else if (!val) {
      prevVal = "";
    }
  }
  
  return (code + "0000").slice(0, 4);
}
