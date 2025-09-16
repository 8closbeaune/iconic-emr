import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { BookOpen, Plus, Search, Edit3, Stethoscope, Syringe, Settings } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { AddDiagnosisModal } from './AddDiagnosisModal';
import { AddTreatmentModal } from './AddTreatmentModal';
import { EditDiagnosisModal } from './EditDiagnosisModal';
import { EditTreatmentModal } from './EditTreatmentModal';
import { DiagnosisRulesModal } from './DiagnosisRulesModal';

export function CatalogManagement() {
  const { useDiagnoses, useTreatments, updateDiagnosis, updateTreatment } = useAdmin();
  const { data: diagnoses, isLoading: diagnosesLoading } = useDiagnoses();
  const { data: treatments, isLoading: treatmentsLoading } = useTreatments();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDiagnosisModal, setShowAddDiagnosisModal] = useState(false);
  const [showAddTreatmentModal, setShowAddTreatmentModal] = useState(false);
  const [showEditDiagnosisModal, setShowEditDiagnosisModal] = useState(false);
  const [showEditTreatmentModal, setShowEditTreatmentModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);

  const filteredDiagnoses = diagnoses?.filter(diagnosis => 
    diagnosis.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    diagnosis.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTreatments = treatments?.filter(treatment => 
    treatment.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    treatment.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleDiagnosisActive = async (diagnosis: any, active: boolean) => {
    try {
      await updateDiagnosis.mutateAsync({
        id: diagnosis.id,
        active,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleToggleTreatmentActive = async (treatment: any, active: boolean) => {
    try {
      await updateTreatment.mutateAsync({
        id: treatment.id,
        active,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditDiagnosis = (diagnosis: any) => {
    setSelectedDiagnosis(diagnosis);
    setShowEditDiagnosisModal(true);
  };

  const handleEditTreatment = (treatment: any) => {
    setSelectedTreatment(treatment);
    setShowEditTreatmentModal(true);
  };

  const handleManageRules = (diagnosis: any) => {
    setSelectedDiagnosis(diagnosis);
    setShowRulesModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <BookOpen className="h-5 w-5 mr-2" />
          <h2 className="text-lg font-semibold">Clinical Catalog</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search diagnoses and treatments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-80"
          />
        </div>
      </div>

      <Tabs defaultValue="diagnoses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="diagnoses" className="flex items-center">
            <Stethoscope className="h-4 w-4 mr-2" />
            Diagnoses ({filteredDiagnoses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="treatments" className="flex items-center">
            <Syringe className="h-4 w-4 mr-2" />
            Treatments ({filteredTreatments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnoses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Diagnoses Management</span>
                <Button onClick={() => setShowAddDiagnosisModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Diagnosis
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnosesLoading ? (
                <div className="text-center py-8">Loading diagnoses...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name (EN)</TableHead>
                      <TableHead>Name (AR)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDiagnoses?.map((diagnosis) => (
                      <TableRow key={diagnosis.id}>
                        <TableCell className="font-mono text-sm">
                          {diagnosis.code || 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {diagnosis.name_en}
                        </TableCell>
                        <TableCell>
                          {diagnosis.name_ar || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={diagnosis.active}
                              onCheckedChange={(checked) => handleToggleDiagnosisActive(diagnosis, checked)}
                              disabled={updateDiagnosis.isPending}
                            />
                            <Badge variant={diagnosis.active ? 'default' : 'secondary'}>
                              {diagnosis.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditDiagnosis(diagnosis)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleManageRules(diagnosis)}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filteredDiagnoses?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No diagnoses found matching your search.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Treatments Management</span>
                <Button onClick={() => setShowAddTreatmentModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Treatment
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {treatmentsLoading ? (
                <div className="text-center py-8">Loading treatments...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name (EN)</TableHead>
                      <TableHead>Name (AR)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTreatments?.map((treatment) => (
                      <TableRow key={treatment.id}>
                        <TableCell className="font-mono text-sm">
                          {treatment.code || 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {treatment.name_en}
                        </TableCell>
                        <TableCell>
                          {treatment.name_ar || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={treatment.active}
                              onCheckedChange={(checked) => handleToggleTreatmentActive(treatment, checked)}
                              disabled={updateTreatment.isPending}
                            />
                            <Badge variant={treatment.active ? 'default' : 'secondary'}>
                              {treatment.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTreatment(treatment)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filteredTreatments?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No treatments found matching your search.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddDiagnosisModal
        open={showAddDiagnosisModal}
        onOpenChange={setShowAddDiagnosisModal}
      />

      <AddTreatmentModal
        open={showAddTreatmentModal}
        onOpenChange={setShowAddTreatmentModal}
      />

      <EditDiagnosisModal
        open={showEditDiagnosisModal}
        onOpenChange={setShowEditDiagnosisModal}
        diagnosis={selectedDiagnosis}
      />

      <EditTreatmentModal
        open={showEditTreatmentModal}
        onOpenChange={setShowEditTreatmentModal}
        treatment={selectedTreatment}
      />

      <DiagnosisRulesModal
        open={showRulesModal}
        onOpenChange={setShowRulesModal}
        diagnosis={selectedDiagnosis}
      />
    </div>
  );
}