# Inventory Consistency Audit

Inventory consistency remediation is implemented and awaiting final CI verification.

Stock decreases when a normal or Bonus Bon is created. Editing a Piutang Bon restores the previous reservation and applies the new one atomically. Soft-delete and Void restore stock. Settlement and payment cancellation do not alter stock.

The implementation uses a persistent inventory marker for legacy compatibility, deterministic product row locks, conditional stock updates, and tests for concurrent overselling.
