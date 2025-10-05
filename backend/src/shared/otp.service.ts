export class OtpService {
  // Simple generator for a six-digit code
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
