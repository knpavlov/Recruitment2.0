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

  const handleInvite = () => {
    const result = inviteAccount(email, targetRole);
    if (!result.ok) {
      const message =
        result.error === 'duplicate'
          ? 'Такой пользователь уже приглашён.'
          : 'Введите корректный email.';
      setBanner({ type: 'error', text: message });
      return;
    }
    setBanner({ type: 'info', text: `Приглашение отправлено на ${result.data.email}.` });
    setEmail('');
  };

  const handleActivate = (id: string) => {
    const result = activateAccount(id);
    if (!result.ok) {
      setBanner({ type: 'error', text: 'Не удалось активировать аккаунт.' });
      return;
    }
    setBanner({ type: 'info', text: `Аккаунт ${result.data.email} активирован.` });
  };

  const handleRemove = (id: string) => {
    const confirmed = window.confirm('Удалить аккаунт безвозвратно?');
    if (!confirmed) {
      return;
    }
    const result = removeAccount(id);
    if (!result.ok) {
      setBanner({ type: 'error', text: 'Не удалось удалить аккаунт.' });
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
          <button className={styles.primaryButton} onClick={handleInvite}>
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
                <td className={styles.actionsCell}>
                  {account.status === 'pending' && (
                    <button className={styles.secondaryButton} onClick={() => handleActivate(account.id)}>
                      Активировать
                    </button>
                  )}
                  {account.role !== 'super-admin' && (
                    <button className={styles.dangerButton} onClick={() => handleRemove(account.id)}>
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
