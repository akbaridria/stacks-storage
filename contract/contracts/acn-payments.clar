;; ACN payments: split STX between seller (97%) and protocol treasury (3%).
;; Caller (e.g. facilitator) must have the full amount; contract transfers from tx-sender.

(define-constant err-unauthorized (err u200))
(define-constant err-invalid-amount (err u201))

(define-data-var treasury principal tx-sender)
(define-data-var owner principal tx-sender)

(define-public (distribute-payment (seller principal) (amount-ustx uint))
  (begin
    (asserts! (> amount-ustx u0) err-invalid-amount)
    (let (
      (seller-amount (/ (* amount-ustx u97) u100))
      (treasury-amount (- amount-ustx seller-amount))
    )
      (try! (stx-transfer? seller-amount tx-sender seller))
      (try! (stx-transfer? treasury-amount tx-sender (var-get treasury)))
      (ok true))))

(define-public (set-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-unauthorized)
    (var-set treasury new-treasury)
    (ok true)))

(define-read-only (get-treasury)
  (var-get treasury))
