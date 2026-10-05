// 결제(토스페이먼츠) 서버 계층 타입. 이 폴더(src/server)는 브라우저 번들에 들어가지 않는다 (아키텍처 테스트).
// 환경 변수·시계·난수는 여기서 읽지 않고 호출자(api 계층)가 주입한다.

export const ORDER_STATUSES = ["CREATED", "PAYMENT_REQUESTED", "PAID", "FAILED", "CANCELLED", "REFUND_REQUESTED", "REFUNDED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type TossMode = "test" | "live";
export type OrderSource = "development" | "preview" | "production";

export interface Order {
  readonly order_id: string;
  readonly result_id: string | null;
  readonly product_id: string;
  readonly amount: number;
  readonly currency: "KRW";
  readonly status: OrderStatus;
  readonly chart_key: string;
  readonly purchase_code_hash: string;
  readonly payment_key: string | null;
  readonly method: string | null;
  readonly toss_mode: TossMode;
  readonly source: OrderSource;
  readonly failure_code: string | null;
  readonly failure_message: string | null;
  readonly approved_at: string | null;
  readonly content_opened_at: string | null;
}

export type NewOrder = Pick<Order, "order_id" | "result_id" | "product_id" | "amount" | "currency" | "status" | "chart_key" | "purchase_code_hash" | "toss_mode" | "source">;

export type OrderPatch = Partial<Pick<Order, "status" | "payment_key" | "method" | "failure_code" | "failure_message" | "approved_at" | "purchase_code_hash">> & { readonly refund_reason?: string };

/** 주문 저장소 (Supabase service_role). 실패하면 예외를 던진다. */
export interface OrderRepo {
  insert(o: NewOrder): Promise<void>;
  get(orderId: string): Promise<Order | null>;
  findByPurchaseCodeHash(hash: string): Promise<Order | null>;
  /** status 가 from 중 하나일 때만 바꾼다(원자적). 바뀌면 바뀐 주문, 아니면 null */
  transition(orderId: string, from: readonly OrderStatus[], patch: OrderPatch): Promise<Order | null>;
  /** DB row lock, PAID check and first-open timestamp in one transaction. */
  openContent(orderId: string, codeHash: string, chartKey: string, productId: string, mode: TossMode): Promise<Order | null>;
  /** Atomically prevent content opening before customer cancellation begins. */
  claimUnopenedRefund(orderId: string, codeHash: string, chartKey: string, productId: string, mode: TossMode): Promise<Order | null>;
}

/** 토스 결제 객체 중 우리가 쓰는 부분 */
export interface TossPayment {
  readonly paymentKey: string;
  readonly orderId: string;
  readonly status: string; // DONE, CANCELED, PARTIAL_CANCELED, ABORTED, EXPIRED, READY, IN_PROGRESS, WAITING_FOR_DEPOSIT
  readonly totalAmount: number;
  readonly method: string | null;
  readonly approvedAt: string | null;
}

export type TossResult = { readonly ok: true; readonly payment: TossPayment } | { readonly ok: false; readonly httpStatus: number; readonly code: string; readonly message: string };

export interface TossClient {
  /** POST /v1/payments/confirm (Idempotency-Key 사용) */
  confirm(input: { paymentKey: string; orderId: string; amount: number; idempotencyKey: string }): Promise<TossResult>;
  /** GET /v1/payments/orders/{orderId} */
  getByOrderId(orderId: string): Promise<TossResult>;
  /** POST /v1/payments/{paymentKey}/cancel (Idempotency-Key 사용) */
  cancel(input: { paymentKey: string; reason: string; idempotencyKey: string }): Promise<TossResult>;
}

export interface PaymentDeps {
  readonly repo: OrderRepo;
  readonly toss: TossClient;
  /** sha256 hex */
  readonly sha256: (text: string) => string;
  /** 주문 번호용 무작위 id (UUID) — 사주 계산과 무관 */
  readonly newOrderId: () => string;
  /** 구매 코드 원문 생성 (예: ABCD-EFGH-JKLM-NPQR) */
  readonly newPurchaseCode: () => string;
  readonly tossMode: TossMode;
  readonly source: OrderSource;
}

/** API 응답 (화면에 보낼 것만). 실패 코드는 화면 문구로 바꿔 보여 준다. */
export type ApiResult<T> = { readonly ok: true; readonly status: number; readonly body: T } | { readonly ok: false; readonly status: number; readonly code: string; readonly message: string };
