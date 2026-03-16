const net = require("net");

function checkMailbox(mxHost, email, timeoutMs = 10000) {
  return new Promise((resolve) => {
    let state = 0;
    let buffer = "";
    let settled = false;

    function settle(value) {
      if (settled) return;
      settled = true;
      try {
        socket.write("QUIT\r\n");
      } catch (_) {}
      socket.destroy();
      resolve(value);
    }

    const socket = net.createConnection({ host: mxHost, port: 25 });
    socket.setTimeout(timeoutMs);
    socket.setEncoding("utf8");

    socket.on("data", (chunk) => {
      buffer += chunk;

      const lines = buffer.split("\r\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line) continue;

        const code = parseInt(line.slice(0, 3), 10);
        const isFinal = line[3] === " " || line.length === 3;

        if (!isFinal) continue;

        switch (state) {
          case 0:
            if (code === 220) {
              state = 1;
              socket.write(`EHLO verify.local\r\n`);
            } else {
              settle({ result: "unknown", code: 3, sub: "smtp_banner_error" });
            }
            break;

          case 1:
            if (code === 250) {
              state = 2;
              socket.write(`MAIL FROM:<verify@verify.local>\r\n`);
            } else {
              settle({ result: "unknown", code: 3, sub: "smtp_ehlo_error" });
            }
            break;

          case 2:
            if (code === 250) {
              state = 3;
              socket.write(`RCPT TO:<${email}>\r\n`);
            } else {
              settle({
                result: "unknown",
                code: 3,
                sub: "smtp_mailfrom_error",
              });
            }
            break;

          case 3:
            if (code >= 200 && code < 300) {
              settle({ result: "valid", code: 1, sub: "mailbox_exists" });
            } else if (code >= 500 && code < 600) {
              settle({
                result: "invalid",
                code: 6,
                sub: "mailbox_does_not_exist",
              });
            } else if (code >= 400 && code < 500) {
              settle({ result: "unknown", code: 3, sub: "greylisted" });
            } else {
              settle({
                result: "unknown",
                code: 3,
                sub: "smtp_unexpected_response",
              });
            }
            break;
        }
      }
    });

    socket.on("timeout", () => {
      settle({ result: "unknown", code: 3, sub: "connection_timeout" });
    });

    socket.on("error", (err) => {
      if (err.code === "ECONNREFUSED") {
        settle({ result: "unknown", code: 3, sub: "connection_refused" });
      } else {
        settle({ result: "unknown", code: 3, sub: "connection_error" });
      }
    });

    socket.on("close", () => {
      if (!settled) {
        settle({ result: "unknown", code: 3, sub: "connection_closed_early" });
      }
    });
  });
}

module.exports = { checkMailbox };
