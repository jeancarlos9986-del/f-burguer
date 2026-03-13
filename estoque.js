import { db } from "./firebase.js";
import {
    collection, onSnapshot, doc, updateDoc, getDoc, setDoc, writeBatch, increment, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1️⃣ INICIALIZAÇÃO E ESCUTA EM TEMPO REAL
document.addEventListener("DOMContentLoaded", () => {
    const tabela = document.getElementById("tabela-estoque");
    if (!tabela) return;

    onSnapshot(collection(db, "estoque"), (snapshot) => {
        tabela.innerHTML = "";

        const itens = [];
        snapshot.forEach(docSnap => itens.push({ id: docSnap.id, ...docSnap.data() }));
        itens.sort((a, b) => a.id.localeCompare(b.id));

        itens.forEach((item) => {
            const tr = document.createElement("tr");
            const estiloBaixo = item.quantidade < 5 ? "style='color: #ff5252; font-weight: bold;'" : "";
            tr.innerHTML = `
                <td>${item.id}</td>
                <td ${estiloBaixo}>${item.quantidade}</td>
                <td>
                    <button class="btn-acao" data-id="${item.id}" data-val="-1" style="background:#444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">-</button>
                    <button class="btn-acao" data-id="${item.id}" data-val="1" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">+</button>
                </td>
            `;
            tabela.appendChild(tr);
        });

        // Correção: usando currentTarget para evitar erro de elemento filho undefined
        document.querySelectorAll(".btn-acao").forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.dataset.id;
                const val = parseInt(e.currentTarget.dataset.val);
                if (id) ajustarEstoque(id, val);
            };
        });
    });
});

// 2️⃣ AJUSTE MANUAL (Com verificação de ID)
async function ajustarEstoque(id, mudanca) {
    if (!id) return;
    try {
        const itemRef = doc(db, "estoque", id);
        await updateDoc(itemRef, {
            quantidade: increment(mudanca),
            ultimaAtualizacao: new Date()
        });
    } catch (e) {
        console.error("❌ Erro ao ajustar estoque:", e);
    }
}

// 3️⃣ BAIXA AUTOMÁTICA PROFISSIONAL
window.baixarEstoquePedido = async function (itensDoPedido) {
    try {
        const batch = writeBatch(db);
        for (const [nome, qtd] of Object.entries(itensDoPedido)) {
            const itemRef = doc(db, "estoque", nome);
            batch.update(itemRef, {
                quantidade: increment(-Math.abs(Number(qtd))),
                ultimaAtualizacao: new Date()
            });
        }
        await batch.commit();
        console.log("✅ Estoque atualizado automaticamente!");
    } catch (e) {
        console.error("❌ Erro na baixa:", e);
    }
};

// 4️⃣ RELATÓRIO DE COMPRAS
window.gerarRelatorioCompras = async () => {
    const snapshot = await getDocs(collection(db, "estoque"));
    let lista = [];
    snapshot.forEach(doc => {
        if (doc.data().quantidade < 5) lista.push(`${doc.id}: ${doc.data().quantidade}`);
    });
    alert(lista.length > 0 ? "⚠️ Precisa repor:\n" + lista.join("\n") : "✅ Estoque equilibrado!");
};

// 5️⃣ CADASTRO DE NOVO ITEM
window.cadastrarNovoItem = async () => {
    const nomeInput = document.getElementById("novo-item-nome");
    const qtdInput = document.getElementById("novo-item-qtd");
    const nome = nomeInput.value.trim();
    const qtd = parseInt(qtdInput.value);

    if (nome && !isNaN(qtd)) {
        await setDoc(doc(db, "estoque", nome), { quantidade: qtd, ultimaAtualizacao: new Date() });
        nomeInput.value = ""; qtdInput.value = "";
    }
};