import { createRoot } from "react-dom/client";
import { InsuranceChatPage } from "@/features/insurance-chat";
import "@/app/styles.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<InsuranceChatPage />);
