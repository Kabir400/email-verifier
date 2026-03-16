const { verifyEmail } = require('../verifyEmail');
const { getMXRecords } = require('../dnsLookUp');
const { checkMailbox } = require('../smtpClient');

jest.mock('../dnsLookUp');
jest.mock('../smtpClient');

describe('verifyEmail tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Syntax validation tests', () => {
    it('Valid email formats pass validation and trigger SMTP checks', async () => {
      getMXRecords.mockResolvedValue(['mx.example.com']);
      checkMailbox.mockResolvedValue({ result: 'valid', code: 1, sub: 'mailbox_exists' });
      
      const result = await verifyEmail('test@example.com');
      
      expect(result.result).toBe('valid');
      expect(getMXRecords).toHaveBeenCalledWith('example.com');
      expect(checkMailbox).toHaveBeenCalledWith('mx.example.com', 'test@example.com');
    });

    it('Invalid formats rejected (missing @)', async () => {
      const result = await verifyEmail('testexample.com');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('invalid_syntax');
      expect(getMXRecords).not.toHaveBeenCalled();
    });

    it('Invalid formats rejected (double dots)', async () => {
      const result = await verifyEmail('test..email@example.com');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('invalid_syntax');
    });

    it('Invalid formats rejected (no domain)', async () => {
      const result = await verifyEmail('test@');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('invalid_syntax');
    });
  });

  describe('SMTP error code tests', () => {
    it('550 error → invalid result', async () => {
      getMXRecords.mockResolvedValue(['mx.example.com']);
      checkMailbox.mockResolvedValue({ result: 'invalid', code: 6, sub: 'mailbox_does_not_exist' });
      
      const result = await verifyEmail('test-invalid@example.com');
      
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('mailbox_does_not_exist');
    });

    it('450 error → unknown result', async () => {
      getMXRecords.mockResolvedValue(['mx.example.com']);
      checkMailbox.mockResolvedValue({ result: 'unknown', code: 3, sub: 'greylisted' });
      
      const result = await verifyEmail('test-grey@example.com');
      
      expect(result.result).toBe('unknown');
      expect(result.subresult).toBe('greylisted');
    });

    it('Connection timeout → unknown result', async () => {
      getMXRecords.mockResolvedValue(['mx.example.com']);
      checkMailbox.mockResolvedValue({ result: 'unknown', code: 3, sub: 'connection_timeout' });
      
      const result = await verifyEmail('test-timeout@example.com');
      
      expect(result.result).toBe('unknown');
      expect(result.subresult).toBe('connection_timeout');
    });
  });

  describe('Edge cases', () => {
    it('Empty string handled', async () => {
      const result = await verifyEmail('');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('invalid_syntax');
    });

    it('Null handled', async () => {
      const result = await verifyEmail(null);
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('invalid_syntax');
    });

    it('Undefined handled', async () => {
      const result = await verifyEmail(undefined);
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('invalid_syntax');
    });

    it('Very long email handled', async () => {
      const localPart = 'a'.repeat(300);
      const longEmail = `${localPart}@example.com`;
      getMXRecords.mockResolvedValue(['mx.example.com']);
      checkMailbox.mockResolvedValue({ result: 'valid', code: 1, sub: 'mailbox_exists' });
      
      const result = await verifyEmail(longEmail);
      expect(result.result).toBe('valid');
      expect(checkMailbox).toHaveBeenCalledWith('mx.example.com', longEmail);
    });

    it('Multiple @ symbols rejected', async () => {
      const result = await verifyEmail('test@test@example.com');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('invalid_syntax');
    });
  });

  describe('Other features and MX handling', () => {
    it('Typo detection (Did you mean)', async () => {
      const result = await verifyEmail('test@gmaill.com');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('typo_detected');
      expect(result.didyoumean).toBe('test@gmail.com');
    });

    it('No MX records handles correctly', async () => {
      getMXRecords.mockResolvedValue([]);
      
      const result = await verifyEmail('test@nomx.com');
      
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('no_mx_records');
      expect(checkMailbox).not.toHaveBeenCalled();
    });

    it('Fails gracefully when DNS lookup throws', async () => {
      getMXRecords.mockRejectedValue(new Error('MX_LOOKUP_FAILED'));
      
      const result = await verifyEmail('test@bad-dns.com');
      
      expect(result.result).toBe('unknown');
      expect(result.subresult).toBe('unexpected_error');
    });

    it('Iterates MX hosts successfully if first fails with unknown', async () => {
      getMXRecords.mockResolvedValue(['mx1.example.com', 'mx2.example.com']);
      checkMailbox
        .mockResolvedValueOnce({ result: 'unknown', code: 3, sub: 'connection_timeout' })
        .mockResolvedValueOnce({ result: 'valid', code: 1, sub: 'mailbox_exists' });

      const result = await verifyEmail('test@example.com');
      expect(result.result).toBe('valid');
      expect(checkMailbox).toHaveBeenCalledTimes(2);
    });

    it('Returns fallback unknown result if all MX hosts fail', async () => {
      getMXRecords.mockResolvedValue(['mx1.example.com', 'mx2.example.com']);
      checkMailbox.mockResolvedValue({ result: 'unknown', code: 3, sub: 'connection_timeout' });

      const result = await verifyEmail('test@example.com');
      expect(result.result).toBe('unknown');
      expect(checkMailbox).toHaveBeenCalledTimes(2);
    });
  });
});
