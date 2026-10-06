import http from "node:http";
import nodemailer from "nodemailer";

const SITES = JSON.parse(process.env.SITES_JSON);
const mail = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
const hits = new Map();
const tooMany = (ip) => {
    const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t <600_000);
    list.push(now); hits.set(ip, list); return list.length > 5;
};
const reply = (res, code, obj = {}) => { res.writeHead(code, {"Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

http.createServer(async (req,res) => {
    if (req.method !== "POST" || req.url !== "/api/contact") return reply(res, 404);
    const site = SITES[req.headers.origin];
    if (!site) return reply(res, 403);
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    if (tooMany(ip)) return reply(res, 429);

    let raw = ""; for await (const c of req) { raw += c; if (raw.length > 10_000) return reply(res, 413); }
    let b; try { b = JSON.parse(raw); } catch { return reply(res, 400); }
    if (b.website) return reply(res, 200);
    const { name, email, message } = b;
    if (![name, email, message].every(v => typeof v === "string" && v.trim() || !/^\S+@\S+\.\S+$/.test(email)))
        return reply(res, 400, { error: "invalid" });
    
    try {
        await mail.sendMail({
            from: `"${site.name}" <${process.env.SMTP_USER}>`, to: site.to, replyTo: email,
            subject: `Νέο μύνημα από ${name.slice(0, 80).replace(/[\r\n]/g, " ")}`,
            text: `${message}\n\n-- ${name} <${email}>`,
        });
        reply(res, 200, { ok: true });
    } catch (e) {console.error(e); reply(res, 502); }
}).listen(3000);