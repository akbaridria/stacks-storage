;; File registry: on-chain index of files (CID, price, seller, access count).
;; Only the ACN can register files and record access; sellers can update price and deactivate.

(define-constant err-unauthorized (err u100))
(define-constant err-file-not-found (err u101))
(define-constant err-file-already-registered (err u102))
(define-constant err-file-inactive (err u103))

(define-data-var owner principal tx-sender)
(define-data-var acn principal tx-sender)

(define-map files
  (string-ascii 64)
  {
    cid: (string-ascii 128),
    price-ustx: uint,
    seller: principal,
    active: bool,
    access-count: uint
  })

(define-public (set-acn (new-acn principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-unauthorized)
    (var-set acn new-acn)
    (ok true)))

(define-public (register-file
  (file-id (string-ascii 64))
  (cid (string-ascii 128))
  (price-ustx uint)
  (seller principal))
  (begin
    (asserts! (is-eq tx-sender (var-get acn)) err-unauthorized)
    (asserts! (is-none (map-get? files file-id)) err-file-already-registered)
    (map-insert files file-id {
      cid: cid,
      price-ustx: price-ustx,
      seller: seller,
      active: true,
      access-count: u0
    })
    (ok true)))

(define-public (update-price (file-id (string-ascii 64)) (new-price-ustx uint))
  (let ((entry (unwrap! (map-get? files file-id) err-file-not-found)))
    (asserts! (is-eq tx-sender (get seller entry)) err-unauthorized)
    (map-set files file-id (merge entry { price-ustx: new-price-ustx }))
    (ok true)))

(define-public (deactivate (file-id (string-ascii 64)))
  (let ((entry (unwrap! (map-get? files file-id) err-file-not-found)))
    (asserts! (is-eq tx-sender (get seller entry)) err-unauthorized)
    (map-set files file-id (merge entry { active: false }))
    (ok true)))

(define-public (record-access (file-id (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get acn)) err-unauthorized)
    (let ((entry (unwrap! (map-get? files file-id) err-file-not-found)))
      (asserts! (get active entry) err-file-inactive)
      (map-set files file-id (merge entry {
        access-count: (+ (get access-count entry) u1)
      }))
      (ok true))))

(define-read-only (get-file (file-id (string-ascii 64)))
  (map-get? files file-id))

(define-read-only (get-access-count (file-id (string-ascii 64)))
  (match (map-get? files file-id)
    entry (ok (get access-count entry))
    err-file-not-found))

(define-read-only (get-acn)
  (var-get acn))
