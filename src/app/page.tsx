import { PaneGrid, Pane } from "@/components/terminal/PaneGrid";
import { FingerprintPanel } from "@/components/panels/FingerprintPanel";
import { ActivityFeedPanel } from "@/components/panels/ActivityFeedPanel";
import { BillTrackerPanel } from "@/components/panels/BillTrackerPanel";
import { NetworkMapPanel } from "@/components/panels/NetworkMapPanel";

export default function DashboardPage() {
  return (
    <PaneGrid>
      {/* A — Primary: Bill tracker */}
      <Pane id="bill-tracker" title="LEGISLATIVE TRACKER" badge="LIVE" badgeColor="green">
        <BillTrackerPanel />
      </Pane>

      {/* B — Secondary: Activity feed */}
      <Pane id="activity-feed" title="SIGNAL FEED" badge="STREAMING" badgeColor="amber">
        <ActivityFeedPanel />
      </Pane>

      {/* C — Fingerprint engine */}
      <Pane id="fingerprint" title="LOBBYIST FINGERPRINT" badge="ANALYSIS" badgeColor="red">
        <FingerprintPanel />
      </Pane>

      {/* D — Network map */}
      <Pane id="network" title="INFLUENCE NETWORK" badge="BETA">
        <NetworkMapPanel />
      </Pane>
    </PaneGrid>
  );
}
