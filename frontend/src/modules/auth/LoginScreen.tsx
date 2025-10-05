import { FormEvent, useState } from 'react';
import styles from '../../styles/LoginScreen.module.css';
import { useAuth, RequestCodeError, VerifyCodeError } from './AuthContext';

interface StatusMessage {
  type: 'info' | 'error';
  text: string;
}

const mapRequestError = (error: RequestCodeError): string => {
  switch (error) {
    case 'invalid-email':
      return 'Enter a valid email address.';
    case 'not-found':
      return 'We could not find an admin account with this email.';
    default:
      return 'Something went wrong. Try again later.';
  }
};

const mapVerifyError = (error: VerifyCodeError): string => {
  switch (error) {
    case 'invalid':
      return 'The access code is incorrect.';
    case 'expired':
      return 'The code has expired. Request a new one.';
    default:
      return 'Failed to confirm the access code. Try again later.';
  }
};

export const LoginScreen = () => {
  const { requestCode, verifyCode } = useAuth();
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setSubmitting(true);
    const result = await requestCode(email);
    if (result.ok) {
      // Сохраняем нормализованный email, чтобы уменьшить ошибки при вводе кода
      setEmail(result.email);
      setStage('code');
      setStatus({ type: 'info', text: `We sent a code to ${result.email}.` });
      setCode('');
    } else {
      setStatus({ type: 'error', text: mapRequestError(result.error) });
    }
    setSubmitting(false);
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setSubmitting(true);
    const result = await verifyCode(email, code, rememberMe);
    if (result.ok) {
      setStatus(null);
    } else {
      setStatus({ type: 'error', text: mapVerifyError(result.error) });
    }
    setSubmitting(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.logo}>R2</div>
          <div>
            <h1>Recruitment 2.0</h1>
            <p className={styles.subtitle}>Secure sign-in for admin accounts.</p>
          </div>
        </header>

        {stage === 'email' && (
          <form className={styles.form} onSubmit={handleRequest}>
            <label className={styles.label}>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@company.com"
                autoComplete="email"
                required
              />
            </label>
            <button type="submit" className={styles.primaryButton} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send access code'}
            </button>
            <p className={styles.hint}>You will receive a six-digit code in the inbox.</p>
          </form>
        )}

        {stage === 'code' && (
          <form className={styles.form} onSubmit={handleVerify}>
            <div className={styles.confirmationBlock}>
              <p className={styles.infoLine}>Code sent to {email}</p>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  setStage('email');
                  setStatus(null);
                }}
              >
                Use another email
              </button>
            </div>
            <label className={styles.label}>
              Access code
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="000000"
                autoComplete="one-time-code"
                required
              />
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Keep me signed in on this device
            </label>
            <button type="submit" className={styles.primaryButton} disabled={submitting}>
              {submitting ? 'Checking…' : 'Confirm code'}
            </button>
            <p className={styles.hint}>The code expires in ten minutes. Request a new one if needed.</p>
          </form>
        )}

        {status && (
          <div
            className={status.type === 'info' ? styles.infoBanner : styles.errorBanner}
            role="status"
          >
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
};
