module.exports = [
  { kubikName: 'contact.subscribe', apiName: 'contact/subscribe' },
  { kubikName: 'contacts', apiName: 'contacts' },
  { kubikName: 'contact', apiName: 'contact' },
  { kubikName: 'contact.id', apiName: 'contact/{{id}}', method: 'PUT' },
  { kubikName: 'contacts.upload', apiName: 'contacts/upload' },
  { kubikName: 'message.email', apiName: 'message/email' },
  { kubikName: 'message.sms', apiName: 'message/sms' },
  { kubikName: 'message.id.send', apiName: 'message/{{id}}/send' },
  { kubikName: 'message.id.smartsend', apiName: 'message/{{id}}/smartsend' },
  { kubikName: 'orders', apiName: 'orders' },
  { kubikName: 'event', apiName: 'event' },
  { kubikName: 'emails.unsubscribed.add', apiName: 'emails/unsubscribed/add' },
  { kubikName: 'emails.unsubscribed.delete', apiName: 'emails/unsubscribed/delete' },
  { kubikName: 'account.info', apiName: 'account/info' }
]
