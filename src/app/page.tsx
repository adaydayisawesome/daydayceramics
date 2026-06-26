import { HomeShop } from "@/components/home/home-shop";
import { allProductCellsLive } from "@/lib/products";

/** Re-render when Stripe webhook calls revalidatePath after a sale. */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Home() {
  const cells = await allProductCellsLive();
  return <HomeShop cells={cells} />;
}
