import type { Metadata } from "next";
import { DemoJourney } from "../../components/demo-journey/demo-journey";

export const metadata: Metadata = {
  title: "View a saved Sachet case",
  description: "Reopen a Sachet case saved in this browser using its Sachet case reference.",
};

export default function ViewCasePage() {
  return <DemoJourney initialView="CASE_LOOKUP" />;
}
