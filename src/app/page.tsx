import type { Metadata } from "next";
import { DemoJourney } from "../components/demo-journey/demo-journey";

export const metadata: Metadata = {
  title: "Prepare a cybercrime complaint",
  description:
    "Tell सचेत what happened and organise the incident, transactions and evidence into complaint details you can review.",
};

export default function HomePage() {
  return <DemoJourney />;
}
