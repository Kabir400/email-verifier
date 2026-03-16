const { validateEmailSyntax } = require("./utils");
const { getMXRecords } = require("./dnsLookUp");
const { checkMailbox } = require("./smtpClient");
const { getDidYouMean } = require("./didYouMean");

async function tryMxHosts(mxHosts, email) {
  let lastResult = null;

  for (const host of mxHosts) {
    const smtpResult = await checkMailbox(host, email);
    lastResult = smtpResult;

    if (smtpResult.result === "valid" || smtpResult.result === "invalid") {
      return smtpResult;
    }

    console.warn(
      `[verifyEmail] ${host} returned '${smtpResult.sub}', trying next MX…`,
    );
  }

  return lastResult;
}

async function verifyEmail(email) {
  const start = Date.now();

  const result = {
    email,
    result: "unknown",
    resultcode: 3,
    subresult: null,
    domain: null,
    mxRecords: [],
    executiontime: 0,
    error: null,
    timestamp: new Date().toISOString(),
    didyoumean: null,
  };

  try {
    //Syntax validation
    if (!validateEmailSyntax(email)) {
      result.result = "invalid";
      result.resultcode = 6;
      result.subresult = "invalid_syntax";
      result.didyoumean = getDidYouMean(email);
      result.executiontime = Math.floor((Date.now() - start) / 1000);
      return result;
    }

    //Typo detection
    const suggestion = getDidYouMean(email);
    if (suggestion) {
      result.result = "invalid";
      result.resultcode = 6;
      result.subresult = "typo_detected";
      result.didyoumean = suggestion;
      result.executiontime = Math.floor((Date.now() - start) / 1000);
      return result;
    }

    //DNS MX lookup
    const domain = email.split("@")[1];
    result.domain = domain;

    const mxRecords = await getMXRecords(domain);
    result.mxRecords = mxRecords;

    if (!mxRecords || mxRecords.length === 0) {
      result.result = "invalid";
      result.resultcode = 6;
      result.subresult = "no_mx_records";
      result.executiontime = Math.floor((Date.now() - start) / 1000);
      return result;
    }

    //check mailbox
    const smtpResult = await tryMxHosts(mxRecords, email);

    result.result = smtpResult.result;
    result.resultcode = smtpResult.code;
    result.subresult = smtpResult.sub;
  } catch (err) {
    result.error = err.message;
    result.subresult = "unexpected_error";
  }

  result.executiontime = Math.floor((Date.now() - start) / 1000);
  return result;
}

module.exports = { verifyEmail };
