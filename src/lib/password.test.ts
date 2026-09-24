import { hashPassword, passwordProblem, verifyPassword } from "./password";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

async function main() {
  const h = await hashPassword("correct horse battery");
  assert(h.startsWith("scrypt$32768$8$1$"), "hash records its scrypt cost");
  assert(!h.includes("correct horse"), "hash does not contain the password");
  assert(await verifyPassword("correct horse battery", h), "right password verifies");
  assert(!(await verifyPassword("correct horse batterY", h)), "wrong password fails");
  assert((await hashPassword("correct horse battery")) !== h, "same password, different salt");
  assert(!(await verifyPassword("x", "plain-text")), "malformed hash never verifies");
  assert(await verifyPassword("ﬁsh-and-chips", await hashPassword("fish-and-chips")), "unicode forms normalise (NFKC)");

  assert(passwordProblem("short") === "short", "under 8 characters is refused");
  assert(passwordProblem("password123") === "common", "famous password is refused");
  assert(passwordProblem("aaaaaaaaaa") === "common", "one repeated character is refused");
  assert(passwordProblem("gagan.goyal", "gagan.goyal@example.com") === "email", "email name as password is refused");
  assert(passwordProblem("mango-tree-1987", "gagan@example.com") === null, "a decent password passes");
}

void main().then(() => {
  if (process.exitCode) {
    console.error("password tests failed");
    process.exit(1);
  }
  console.log("all password tests passed");
});
