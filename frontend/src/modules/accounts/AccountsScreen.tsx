import { useMemo, useState } from 'react';
import styles from '../../styles/AccountsScreen.module.css';
import { useAccountsState } from '../../app/state/AppStateContext';
import { useAuth } from '../auth/AuthContext';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const AccountsScreen = () => {
  const { session } = useAuth();
  const role = session?.role ?? 'user';
  const { list, inviteAccount, activateAccount, removeAccount } = useAccountsState();
  const [email, setEmail] = useState('');
  const [targetRole, setTargetRole] = useState<'admin' | 'user'>('admin');
  const [banner, setBanner] = useState<Banner>(null);

  const sortedAccounts = useMemo(
    () => [...list].sort((a, b) => a.email.localeCompare(b.email)),
    [list]
  );

  if (role !== 'super-admin') {
    return (
      <section className={styles.wrapper}>
        <div className={styles.restricted}>
          <h1>Access denied</h1>
          <p>Only the super admin can manage accounts.</p>
        </div>
      </section>
    );
  }

  const handleInvite = async () => {
    const result = await inviteAccount(email, targetRole);
    if (!result.ok) {
      const message =
        result.error === 'duplicate'
          ? 'This user has already been invited.'
          : result.error === 'invalid-input'
            ? 'Enter a valid email.'
            : 'Failed to send the invitation. Try again later.';
      setBanner({ type: 'error', text: message });
      return;
    }
    setBanner({ type: 'info', text: `Invitation email sent to ${result.data.email}.` });
    setEmail('');
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setBanner({ type: 'info', text: 'Invitation token copied.' });
    } catch (error) {
      console.error('Failed to copy invitation token:', error);
      setBanner({ type: 'error', text: 'Failed to copy the token. Copy it manually.' });
    }
  };

  const handleActivate = async (id: string) => {
    const result = await activateAccount(id);
    if (!result.ok) {
      const message =
        result.error === 'not-found' ? 'Account not found.' : 'Failed to activate the account.';
      setBanner({ type: 'error', text: message });
      return;
    }
    setBanner({ type: 'info', text: `Account ${result.data.email} activated.` });
  };

  const handleRemove = async (id: string) => {
    const confirmed = window.confirm('Delete the account permanently?');
    if (!confirmed) {
      return;
    }
    const result = await removeAccount(id);
    if (!result.ok) {
      const message =
        result.error === 'not-found'
          ? 'Account not found.'
          : result.error === 'invalid-input'
            ? 'The super admin cannot be deleted.'
            : 'Failed to delete the account.';
      setBanner({ type: 'error', text: message });
      return;
    }
    setBanner({ type: 'info', text: 'Account deleted.' });
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Account management</h1>
          <p className={styles.subtitle}>
            Invite admins and users, track activation, and remove accounts.
          </p>
        </div>
        <div className={styles.inviteBlock}>
          <input
            className={styles.emailInput}
            placeholder="email@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <select
            className={styles.roleSelect}
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value as 'admin' | 'user')}
          >
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <button className={styles.primaryButton} onClick={() => void handleInvite()}>
            Send invitation
          </button>
        </div>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Role</th>
              <th>Invitation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((account) => (
              <tr key={account.id}>
                <td>{account.email}</td>
                <td>
                  <span
                    className={
                      account.status === 'active' ? styles.statusBadgeActive : styles.statusBadgePending
                    }
                  >
                    {account.status === 'active' ? 'Active' : 'Pending activation'}
                  </span>
                </td>
                <td>{account.role === 'super-admin' ? 'Super admin' : account.role === 'admin' ? 'Admin' : 'User'}</td>
                <td>
                  {account.status === 'pending' ? (
                    <div className={styles.tokenCell}>
                      <code className={styles.tokenValue}>{account.invitationToken}</code>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => void handleCopyToken(account.invitationToken)}
                      >
                        Copy
                      </button>
                    </div>
                  ) : (
                    <span className={styles.tokenInfo}>Account active</span>
                  )}
                </td>
                <td className={styles.actionsCell}>
                  {account.status === 'pending' && (
                    <button
                      className={styles.secondaryButton}
                      onClick={() => void handleActivate(account.id)}
                    >
                      Activate
                    </button>
                  )}
                  {account.role !== 'super-admin' && (
                    <button
                      className={styles.dangerButton}
                      onClick={() => void handleRemove(account.id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
