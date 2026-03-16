// Testing using a local SMTP server.
const { checkMailbox } = require("./src/smtpClient");

async function run() {
  const result1 = await checkMailbox("localhost", "valid@test.com");
  console.log("Valid test:", result1);

  const result2 = await checkMailbox("localhost", "fake@test.com");
  console.log("Invalid test:", result2);
}

run();
