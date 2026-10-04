/** LINE push notifications. Token comes from Script Properties only. Never uses broadcast. */

function linePush_(lineUserId, messages) {
  const token = prop_('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token || !lineUserId) return false;
  try {
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ to: lineUserId, messages: messages }),
      muteHttpExceptions: true,
    });
    return res.getResponseCode() === 200;
  } catch (err) {
    console.error('LINE push failed: ' + err);
    return false;
  }
}

function baht_(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Tell the account owner their transaction completed (honours their notification settings). */
function notifyMember_(settings, member, t) {
  if (!settings.enableGlobalLinePush || !member.lineUserId) return;
  const ns = member.notificationSettings || {};
  if (ns.enableLinePush === false) return;
  const isDeposit = t.type === 'deposit';
  if (isDeposit && ns.notifyOnDeposit === false) return;
  if (!isDeposit && ns.notifyOnWithdraw === false) return;
  if (Number(t.amount) < Number(ns.minimumAmount || 0)) return;

  const acc = String(t.accountNo);
  const masked = acc.length > 4 ? '***' + acc.slice(-4) : acc;
  const title = isDeposit ? 'ฝากเงินเข้าบัญชี' : 'ถอนเงินจากบัญชี';
  linePush_(member.lineUserId, [{
    type: 'flex',
    altText: title + ' ' + baht_(t.amount) + ' บาท',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: isDeposit ? '#059669' : '#dc2626',
        contents: [
          { type: 'text', text: settings.cooperativeName + ' • ' + title, color: '#ffffff', weight: 'bold', size: 'sm', wrap: true },
          { type: 'text', text: '฿' + baht_(t.amount), color: '#ffffff', weight: 'bold', size: 'xxl', margin: 'md' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'text', text: 'รหัสอ้างอิง: ' + t.refCode, size: 'xs', color: '#666666' },
          { type: 'text', text: 'บัญชี: ' + masked, size: 'xs', color: '#111111' },
          { type: 'text', text: 'ยอดคงเหลือ: ฿' + baht_(t.balanceAfter), size: 'sm', color: '#059669', weight: 'bold' },
        ],
      },
    },
  }]);
}

/** Staff have no LINE ids stored yet; log pending items so they show up in Executions. */
function notifyStaffPending_(settings, t) {
  if (settings.notifyStaffOnPendingTxn) console.log('PENDING ' + t.refCode + ' ' + t.type + ' ' + t.amount);
}
