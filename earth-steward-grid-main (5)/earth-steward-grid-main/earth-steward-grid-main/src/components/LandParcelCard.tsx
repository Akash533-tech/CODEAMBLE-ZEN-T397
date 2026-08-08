import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ShieldCheck, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LandParcelCard({ parcel: project }: { parcel: any }) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-border flex flex-col bg-card rounded-xl">
      <CardHeader className="pb-3 bg-secondary/40 border-b border-border/50">
        <div className="flex justify-between items-start mb-2 gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-200 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {project.verification_status}
          </Badge>
          <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-0.5 rounded border truncate max-w-[140px]">{project.project_id}</span>
        </div>
        <CardTitle className="text-base leading-tight text-foreground">{project.project_name}</CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4 pb-0 space-y-4 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">{project.region}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 bg-muted/50 p-3 rounded-xl border border-border/50">
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Available</p>
            <p className="font-black text-xl text-primary">{(project.carbon_credits_available || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Price/Credit</p>
            <p className="font-bold text-xl text-foreground">₹{project.price_per_credit}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs text-muted-foreground bg-background">{project.project_type}</Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground bg-background">{(project.area_hectare || 0).toLocaleString()} hectares</Badge>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2 pt-4 pb-4 px-4">
        <Button
          className="w-full font-semibold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => navigate(`/company/marketplace/${project.project_id}?request=true`)}
        >
          Request Purchase
        </Button>
        <Button
          variant="outline"
          className="w-full bg-background hover:bg-muted"
          onClick={() => navigate(`/company/marketplace/${project.project_id}`)}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
