import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { Influencer } from "@/types";
import { getInfluencers, createInfluencer, deleteInfluencer } from "@/api/influencers";
import { toast } from "sonner";

export default function Influencers() {
  const { user } = useAuth();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    email: "",
    socialHandle: "",
  });

  useEffect(() => {
    const fetchInfluencers = async () => {
      setLoading(true);
      const data = await getInfluencers();
      setInfluencers(data);
      setLoading(false);
    };
    fetchInfluencers();
  }, []);

  const handleAddInfluencer = async () => {
    try {
      const newInfluencer = await createInfluencer(formData);
      setInfluencers(prev => [newInfluencer, ...prev]);
      setFormData({ name: "", bio: "", email: "", socialHandle: "" });
      setOpen(false);
      toast.success("Influencer added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add influencer");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await deleteInfluencer(id);
      setInfluencers(prev => prev.filter(influencer => influencer.id !== id));
      toast.success("Influencer removed");
    } catch {
      toast.error("Failed to remove influencer");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">Influencers</h1>
        {user?.userType === "organizer" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Influencer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Influencer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Social Handle</Label>
                  <Input
                    value={formData.socialHandle}
                    onChange={e => setFormData({ ...formData, socialHandle: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddInfluencer} className="w-full">
                  Add
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading influencers...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {influencers.length === 0 ? (
            <div className="text-muted-foreground text-center py-12">
              No influencers added yet.
            </div>
          ) : (
            influencers.map((influencer) => (
              <div key={influencer.id} className="border rounded-lg p-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-medium">{influencer.name}</h2>
                  <p className="text-sm text-muted-foreground">{influencer.socialHandle}</p>
                  <p className="text-sm">{influencer.bio}</p>
                  <p className="text-sm text-muted-foreground mt-1">{influencer.email}</p>
                  {influencer.referralCode && (
                    <p className="text-xs text-primary mt-1">Referral: {influencer.referralCode}</p>
                  )}
                </div>
                {user?.userType === "organizer" && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(influencer.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
