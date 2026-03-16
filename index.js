const express = require("express");
const { verifyEmail } = require("./src/verifyEmail");

const app = express();
app.use(express.json());

app.get("/verify", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "email query param required" });
  }

  try {
    const result = await verifyEmail(email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
