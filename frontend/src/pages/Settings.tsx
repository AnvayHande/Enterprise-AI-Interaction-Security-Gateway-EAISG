import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { api } from '../lib/api';

interface Destination {
  id: number;
  name: string;
  provider: string;
  trust_level: string;
}

export function Settings() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const data = await api.getDestinations();
        setDestinations(data);
      } catch (err) {
        console.error('Failed to load destinations', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDestinations();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage gateway configuration and AI destinations.</p>
      </div>

      <Tabs defaultValue="destinations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="destinations">AI Destinations</TabsTrigger>
          <TabsTrigger value="risk">Risk Weights</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="destinations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configured Destinations</CardTitle>
              <CardDescription>Manage where prompts are allowed to be routed.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div className="space-y-4">
                  {destinations.length > 0 ? (
                    destinations.map((dest) => (
                      <div key={dest.id} className="flex items-center justify-between border-b pb-4">
                        <div>
                          <p className="font-medium">{dest.name}</p>
                          <p className="text-sm text-muted-foreground">Provider: {dest.provider} | Trust: {dest.trust_level}</p>
                        </div>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No destinations configured.</p>
                  )}
                  <Button className="mt-4">Add Destination</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Aggregation Weights</CardTitle>
              <CardDescription>Configure the boost applied for multiple independent findings.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User & Role Management</CardTitle>
              <CardDescription>Manage who has access to this dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
