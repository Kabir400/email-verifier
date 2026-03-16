// Created a fake SMTP server locally to test whether `checkMailbox` works correctly.
// We define "valid@test.com" as an existing mailbox. Any other address will return
// a 550 SMTP response (mailbox does not exist).

const { SMTPServer } = require("smtp-server");

const server = new SMTPServer({
  disabledCommands: ["AUTH"],

  onRcptTo(address, session, callback) {
    if (address.address === "valid@test.com") {
      return callback();
    }

    return callback({
      responseCode: 550,
      message: "Mailbox does not exist",
    });
  },
});

server.on("error", (err) => {
  if (err.code === "ECONNRESET") {
    return;
  }
  console.error("SMTP Server Error:", err);
});

server.listen(2525, () => {
  console.log("Fake SMTP server running on port 2525");
});
