const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Payment } = require("mercadopago");

const app = express();

app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO DO CLIENTE (Use variáveis de ambiente em produção!)
const ACCESS_TOKEN = "TEST-1833454362280440-031201-68896f3ff8916c92bd0aaa98ce91ffe0-293452112f"
// CONFIGURAÇÃO CORRETA DO CLIENTE
const client = new MercadoPagoConfig({
    accessToken: ACCESS_TOKEN,
    options: { timeout: 5000 }
});
// ROTA DE TESTE
app.get("/", (req, res) => {
    res.send("🚀 Servidor PIX Mercado Pago rodando e pronto para receber pedidos.");
});

// ROTA PARA GERAR PIX
app.post("/pix", async (req, res) => {
    const { valor, descricao } = req.body;

    if (!valor || !descricao) {
        return res.status(400).json({ erro: "Valor e descrição são obrigatórios." });
    }

    try {
        const payment = new Payment(client);
        console.log("Token em uso:", client.config.accessToken);

        const result = await payment.create({
            body: {
                transaction_amount: Number(valor),
                description: descricao,
                payment_method_id: "pix",
                payer: {
                    email: "cliente_teste@email.com"
                }
            },
            // A chave de idempotência garante que a requisição seja única e segura
            requestOptions: {
                idempotencyKey: Date.now().toString()
            }
        });

        // Retornamos os dados necessários para o Front-end gerar o QR Code
        res.json({
            id: result.id,
            status: result.status,
            qr_code: result.point_of_interaction.transaction_data.qr_code,
            qr_base64: result.point_of_interaction.transaction_data.qr_code_base64
        });

    } catch (error) {
        console.error("ERRO DETALHADO:", error);
        res.status(500).json({
            erro: "Erro ao gerar PIX",
            detalhe: error.message
        });
    }
});

// START SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando em http://localhost:${PORT}`);
});