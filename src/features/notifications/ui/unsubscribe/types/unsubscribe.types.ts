export type SubscriptionState =
  | { status: 'idle' }
  | { status: 'unsubscribed' }
  | { status: 'subscribed' }
  | { status: 'invalid' }
  | { status: 'error' }
