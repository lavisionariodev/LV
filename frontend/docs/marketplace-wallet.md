Implement a secure marketplace payment flow where customer payments are NOT transferred directly to sellers immediately.

Required Flow
Customer places and pays for an order
Platform receives and holds the payment first
Order status becomes:
Pending
Paid
Confirmed
In Progress
Completed
Seller earnings remain in a platform-held wallet/balance system
Funds become “Available Balance” only after:
order is completed
delivery confirmation period passes
no refund/dispute exists
Seller can manually request withdrawal to:
bank account
e-wallet
Admin can approve/reject withdrawal requests
Deduct platform commission automatically before releasing seller earnings
Build the following modules
Database Tables

Payment gateway:

PayMongo

User roles:

Buyer
Seller
Admin
Marketplace Payment Flow

Implement a marketplace escrow-like payment system.

Payment Process
Buyer places an order
Buyer pays using PayMongo
Payment is received by the platform's PayMongo account
Platform stores transaction details internally
Seller DOES NOT immediately receive the money
Funds stay in the platform system as “Held Balance”
Seller ships the order
Buyer receives the order
Order becomes completed
Admin manually reviews and releases seller payout
Seller balance becomes withdrawable or marked as paid
Important Rules
Seller cannot directly access held funds
Admin has full control of payout release
Payout can only happen for completed orders
Refund/dispute orders must block payout
Prevent duplicate payout releases
Maintain full transaction logs
Required Wallet Structure

Create seller wallet system with:

held_balance
available_balance
withdrawn_balance
total_earnings
Required Database Tables

Create schema/models for:

users
sellers
buyers
products
orders
order_items
payments
seller_wallets
wallet_transactions
payout_requests
payout_releases
refunds
disputes
Wallet Transaction Types

Support transaction records such as:

order_payment
held_funds
payout_release
withdrawal
refund
adjustment