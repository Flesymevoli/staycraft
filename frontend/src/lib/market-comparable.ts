// Supplier wording is untrusted free text. One matcher keeps both call sites agreeing
// on what counts as a one-night total; a bare "total" cannot establish a stay length.
export const COMPARABLE_ONE_NIGHT=/1\s*晚.*总价|1\s*night.*total|per.?night/i;
