import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { Influencer } from "@/types";
import { getInfluencers, createInfluencer, deleteInfluencer, updateInfluencer } from "@/api/influencers";
import { toast } from "sonner";

export default function Influencers() {
  const { user } = useAuth();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    email: "",
    socialHandle: "",
  });

  useEffect(() => {
    const fetchInfluencers = async () => {
      setLoading(true);
      try {
        const data = await getInfluencers();
        setInfluencers(data);
      } catch (error) {
        toast.error('Failed to load influencers');
      } finally {
        setLoading(false);
      }
    };
    fetchInfluencers();
  }, []);

  const handleAddInfluencer = async () => {
    try {
      if (editingId) {
        const updated = await updateInfluencer(editingId, formData);
        setInfluencers(prev => prev.map(inf => inf.id === editingId ? updated : inf));
        toast.success("Influencer updated");
      } else {
        const newInfluencer = await createInfluencer(formData);
        setInfluencers(prev => [newInfluencer, ...prev]);
        toast.success("Influencer added");
      }
      setFormData({ name: "", bio: "", email: "", socialHandle: "" });
      setEditingId(null);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${editingId ? 'update' : 'add'} influencer`);
    }
  };

  const handleEdit = (influencer: Influencer) => {
    setFormData({
      name: influencer.name,
      email: influencer.email,
      socialHandle: influencer.socialHandle || "",
      bio: influencer.bio || "",
    });
    setEditingId(influencer.id);
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({ name: "", bio: "", email: "", socialHandle: "" });
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
          <Dialog open={open} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Influencer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Influencer</DialogTitle>
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
                  {editingId ? 'Update' : 'Add'}
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
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(influencer)}>
                      <Plus className="w-4 h-4 rotate-45" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(influencer.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
