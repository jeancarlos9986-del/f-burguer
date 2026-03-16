const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Payment } = require("mercadopago");
const admin = require("firebase-admin");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   FIREBASE
========================= */

admin.initializeApp();

const db = admin.firestore();

/* =========================
   CONFIG MERCADO PAGO
========================= */

const ACCESS_TOKEN = "APP_USR-7535882781565948-031313-da5d5532438cd103f8228a4cee75f344-293452112";

const client = new MercadoPagoConfig({
    accessToken: ACCESS_TOKEN,
    options: { timeout: 5000 }
});

const payment = new Payment(client);

/* =========================
   URL WEBHOOK (RAILWAY)
========================= */

const WEBHOOK_URL = "https://f-burguer-production.up.railway.app/webhook";

/* =========================
   ROTA TESTE
========================= */

app.get("/", (req, res) => {
    res.send("🚀 Servidor PIX Mercado Pago rodando");
});

/* =========================
   CRIAR PIX
========================= */

app.post("/pix", async (req, res) => {

    const { valor, descricao, pedidoId } = req.body;

    if (!valor || !descricao) {
        return res.status(400).json({ erro: "Valor e descrição são obrigatórios" });
    }

    try {

        const paymentData = {
            body: {
                transaction_amount: Number(valor),
                description: descricao,
                payment_method_id: "pix",
                payer: { email: "cliente@email.com" },
                metadata: { pedido_id: pedidoId || "sem_pedido" },
                notification_url: WEBHOOK_URL
            }
        };

        const result = await payment.create(paymentData);

        const qr = result.point_of_interaction?.transaction_data;

        if (!qr) {
            return res.status(500).json({ erro: "Mercado Pago não retornou dados do QR Code" });
        }

        res.json({
            pagamento_id: result.id,
            status: result.status,
            qr_code: qr.qr_code,
            qr_base64: qr.qr_code_base64
        });

    } catch (error) {

        console.error("❌ ERRO COMPLETO:", error);

        res.status(500).json({
            erro: "Erro ao gerar PIX",
            detalhe: error.message
        });

    }

});

/* =========================
   CONSULTAR STATUS PIX
========================= */

app.get("/status/:id", async (req, res) => {

    try {

        const pagamentoId = req.params.id;

        const result = await payment.get({
            id: pagamentoId
        });

        res.json({
            id: result.id,
            status: result.status
        });

    } catch (error) {

        console.error("❌ ERRO CONSULTAR PAGAMENTO:", error);

        res.status(500).json({
            erro: "Erro ao consultar pagamento"
        });

    }

});

/* =========================
   WEBHOOK MERCADO PAGO
========================= */

app.post("/webhook", async (req, res) => {

    try {

        const type = req.body.type;

        if (type === "payment") {

            const paymentId = req.body.data.id;

            console.log("📩 Webhook recebido:", paymentId);

            const result = await payment.get({
                id: paymentId
            });

            const status = result.status;

            console.log("Status pagamento:", status);

            if (status === "approved") {

                console.log("✅ PAGAMENTO APROVADO:", paymentId);

                const pedidoId = result.metadata?.pedido_id;

                if (pedidoId && pedidoId !== "sem_pedido") {

                    await db.collection("pedidos").doc(pedidoId).update({
                        status: "Pendente",
                        pago: true,
                        pagoEm: new Date()
                    });

                    console.log("📦 Pedido enviado para cozinha:", pedidoId);

                }

            }

        }

        res.sendStatus(200);

    } catch (error) {

        console.error("❌ ERRO WEBHOOK:", error);

        res.sendStatus(500);

    }

});

/* =========================
   START SERVIDOR
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {

    console.log("====================================");
    console.log("🔥 SERVIDOR RODANDO");
    console.log("PORTA:", PORT);
    console.log("Webhook:", WEBHOOK_URL);
    console.log("====================================");

});