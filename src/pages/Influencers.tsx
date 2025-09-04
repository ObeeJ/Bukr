import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/context/UserContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";

type Influencer = {
  id: string;
  name: string;
  bio: string;
  email: string;
  socialHandle: string;
};

export default function Influencers() {
  const { user } = useUser();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Influencer, "id">>({
    name: "",
    bio: "",
    email: "",
    socialHandle: "",
  });

  useEffect(() => {
    // TODO: Replace with API fetch later
    setInfluencers([
      {
        id: "1",
        name: "Jane Doe",
        bio: "Fashion and lifestyle influencer",
        email: "jane@example.com",
        socialHandle: "@jane_doe",
      },
    ]);
  }, []);

  const handleAddInfluencer = () => {
    const newInfluencer: Influencer = {
      id: Date.now().toString(),
      ...formData,
    };
    setInfluencers(prev => [newInfluencer, ...prev]);
    setFormData({ name: "", bio: "", email: "", socialHandle: "" });
    setOpen(false);
  };

  const handleRemove = (id: string) => {
    setInfluencers(prev => prev.filter(influencer => influencer.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">Influencers</h1>
        {user?.role === "organizer" && (
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
              </div>
              {user?.role === "organizer" && (
                <Button variant="ghost" size="icon" onClick={() => handleRemove(influencer.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
