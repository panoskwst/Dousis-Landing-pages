import globalComunication from "../sites/global-comunication";

const all = {globalComunication};
const id = process.env.SITE_ID as keyof typeof all;
if (!all[id]) throw new Error(`Set SITE_ID to one ofe: ${Object.keys(all).join(",")}`);

export const site = all[id];
export const legal = Object.values(
    import.meta.glob("../sites/*/legal.md", { eager: true })
).find((m: any) => m.file.includes(`/sites/${id}/`)) as any;