import { useMemo, useState } from 'react';
import styles from '../../styles/AccountsScreen.module.css';
import { useAccountsState } from '../../app/state/AppStateContext';
import { useAuth } from '../auth/AuthContext';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const AccountsScreen = () => {
  const { role } = useAuth();
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
          <h1>Доступ ограничен</h1>
          <p>Только суперадмин может управлять аккаунтами.</p>
        </div>
      </section>
    );
  }

  const handleInvite = async () => {
    const result = await inviteAccount(email, targetRole);
    if (!result.ok) {
      const message =
        result.error === 'duplicate'
          ? 'Такой пользователь уже приглашён.'
          : result.error === 'invalid-input'
            ? 'Введите корректный email.'
            : 'Не удалось отправить приглашение. Попробуйте позже.';
      setBanner({ type: 'error', text: message });
      return;
    }
    setBanner({ type: 'info', text: `Приглашение отправлено на ${result.data.email}.` });
    setEmail('');
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setBanner({ type: 'info', text: 'Токен приглашения скопирован.' });
    } catch (error) {
      console.error('Не удалось скопировать токен приглашения:', error);
      setBanner({ type: 'error', text: 'Не удалось скопировать токен. Скопируйте его вручную.' });
    }
  };

  const handleActivate = async (id: string) => {
    const result = await activateAccount(id);
    if (!result.ok) {
      const message =
        result.error === 'not-found' ? 'Аккаунт не найден.' : 'Не удалось активировать аккаунт.';
      setBanner({ type: 'error', text: message });
      return;
    }
    setBanner({ type: 'info', text: `Аккаунт ${result.data.email} активирован.` });
  };

  const handleRemove = async (id: string) => {
    const confirmed = window.confirm('Удалить аккаунт безвозвратно?');
    if (!confirmed) {
      return;
    }
    const result = await removeAccount(id);
    if (!result.ok) {
      const message =
        result.error === 'not-found'
          ? 'Аккаунт не найден.'
          : result.error === 'invalid-input'
            ? 'Нельзя удалить суперадмина.'
            : 'Не удалось удалить аккаунт.';
      setBanner({ type: 'error', text: message });
      return;
    }
    setBanner({ type: 'info', text: 'Аккаунт удалён.' });
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Управление аккаунтами</h1>
          <p className={styles.subtitle}>
            Приглашайте админов и пользователей, отслеживайте активацию и удаляйте учётные записи.
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
            <option value="admin">Админ</option>
            <option value="user">Пользователь</option>
          </select>
          <button className={styles.primaryButton} onClick={() => void handleInvite()}>
            Отправить приглашение
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
              <th>Статус</th>
              <th>Роль</th>
              <th>Приглашение</th>
              <th>Действия</th>
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
                    {account.status === 'active' ? 'Активен' : 'Не активирован'}
                  </span>
                </td>
                <td>{account.role === 'super-admin' ? 'Суперадмин' : account.role === 'admin' ? 'Админ' : 'Пользователь'}</td>
                <td>
                  {account.status === 'pending' ? (
                    <div className={styles.tokenCell}>
                      <code className={styles.tokenValue}>{account.invitationToken}</code>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => void handleCopyToken(account.invitationToken)}
                      >
                        Скопировать
                      </button>
                    </div>
                  ) : (
                    <span className={styles.tokenInfo}>Аккаунт активен</span>
                  )}
                </td>
                <td className={styles.actionsCell}>
                  {account.status === 'pending' && (
                    <button
                      className={styles.secondaryButton}
                      onClick={() => void handleActivate(account.id)}
                    >
                      Активировать
                    </button>
                  )}
                  {account.role !== 'super-admin' && (
                    <button
                      className={styles.dangerButton}
                      onClick={() => void handleRemove(account.id)}
                    >
                      Удалить
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
