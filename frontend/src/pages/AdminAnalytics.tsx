import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { ShieldAlert, Users, FolderCheck, Cpu, UploadCloud, ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/contexts/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const ADMIN_EMAIL = "sampatakumarsv@gmail.com";

interface DailyAnalytics {
  date: string;
  rateLimitHits: number;
  groqRequests: number;
  newUsers: number;
  portfoliosPublished: number;
  resumesUploaded: number;
  apiHits: Record<string, number>;
}

export default function AdminAnalytics() {
  const { firebaseUser, backendUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<DailyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const adminEmail = backendUser?.email || firebaseUser?.email || "";
  const isAdmin = adminEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchAnalytics = async () => {
      try {
        const response = await apiRequest<DailyAnalytics[]>("/admin/analytics");

        if (!cancelled) {
          setData(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to fetch analytics", {
            description: error instanceof Error ? error.message : "Unknown error occurred"
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin]);

  const { kpis, aggregatedApiHits } = useMemo(() => {
    if (!data.length) return { kpis: null, aggregatedApiHits: [] };

    const sum = data.reduce(
      (acc, curr) => {
        acc.newUsers += curr.newUsers || 0;
        acc.portfoliosPublished += curr.portfoliosPublished || 0;
        acc.groqRequests += curr.groqRequests || 0;
        acc.resumesUploaded += curr.resumesUploaded || 0;
        acc.rateLimitHits += curr.rateLimitHits || 0;

        Object.entries(curr.apiHits || {}).forEach(([route, count]) => {
          const safeRoute = route || "Unknown endpoint";
          acc.apiHitMap[safeRoute] = (acc.apiHitMap[safeRoute] || 0) + (count as number);
        });

        return acc;
      },
      { newUsers: 0, portfoliosPublished: 0, groqRequests: 0, resumesUploaded: 0, rateLimitHits: 0, apiHitMap: {} as Record<string, number> }
    );

    const topApiHits = Object.entries(sum.apiHitMap)
      .map(([route, hits]) => ({ route, hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return { kpis: sum, aggregatedApiHits: topApiHits };
  }, [data]);

  if (authLoading || (loading && isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You do not have administrative privileges to view this area.</p>
        <Link to="/dashboard" className="text-primary hover:underline mt-6">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No analytics data available yet. Data is generated upon API usage.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="rounded-full p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Analytics</h1>
          <p className="text-muted-foreground">Global data overview over the last 14 days.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border/50 bg-card/40 backdrop-blur pb-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Users</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.newUsers}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/40 backdrop-blur pb-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Requests</CardTitle>
            <Cpu className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.groqRequests}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/40 backdrop-blur pb-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Portfolios Implemented</CardTitle>
            <FolderCheck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.portfoliosPublished}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/40 backdrop-blur pb-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resumes Parsed</CardTitle>
            <UploadCloud className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.resumesUploaded}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-red-950/20 backdrop-blur pb-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rate Limit Blocks</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kpis.rateLimitHits}</div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-2 opacity-50" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="col-span-1 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>14-Day Growth Trend</CardTitle>
            <CardDescription>Visualizing AI and conversion growth over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => String(value).split("-").slice(1).join("/")}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                  <Line type="monotone" name="Portfolios" dataKey="portfoliosPublished" stroke="hsl(230, 80%, 65%)" strokeWidth={3} dot={false} />
                  <Line type="monotone" name="AI Generates" dataKey="groqRequests" stroke="hsl(200, 90%, 50%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" name="New Users" dataKey="newUsers" stroke="hsl(150, 70%, 45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Top API Endpoints</CardTitle>
            <CardDescription>Most frequently hit backend routes measured across aggregate.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedApiHits} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="route"
                    stroke="hsl(var(--foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  />
                  <Bar dataKey="hits" name="Total Hits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
