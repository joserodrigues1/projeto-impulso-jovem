import type { Metadata } from "next";
import { ListaCurriculos } from "@/components/curriculo/lista-curriculos";

export const metadata: Metadata = {
  title: "Meus currículos",
};

export default function CurriculosPage() {
  return <ListaCurriculos />;
}
