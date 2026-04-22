import { getDb, toObjectId, serializeDoc, serializeDocs } from '../config/database.js';

const USER_PROJECTION = { password_hash: 0 };

export const createOpportunity = async (req, res) => {
  try {
    const { title, type, company, description, requirements } = req.body;
    if (!title || !type || !company || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['internship', 'referral', 'job', 'project'].includes(type)) {
      return res.status(400).json({ error: 'Invalid opportunity type' });
    }

    const db = getDb();
    const doc = {
      posted_by: req.user.id,
      title,
      type,
      company,
      description,
      requirements: requirements || null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const result = await db.collection('opportunities').insertOne(doc);
    res.status(201).json({ message: 'Opportunity created', opportunity: serializeDoc({ _id: result.insertedId, ...doc }) });
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
};

export const getOpportunities = async (req, res) => {
  try {
    const db = getDb();
    const { type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    filter.status = status || 'active';

    const opportunities = await db.collection('opportunities').find(filter).sort({ created_at: -1 }).toArray();
    const serialized = serializeDocs(opportunities);

    const posterIds = serialized.map((o) => toObjectId(o.posted_by)).filter(Boolean);
    const posters = await db.collection('users').find({ _id: { $in: posterIds } }, { projection: USER_PROJECTION }).toArray();
    const posterMap = new Map(serializeDocs(posters).map((p) => [p.id, p]));

    res.json({
      opportunities: serialized.map((o) => ({
        ...o,
        poster: posterMap.get(o.posted_by)
          ? {
              id: posterMap.get(o.posted_by).id,
              name: posterMap.get(o.posted_by).name,
              company: posterMap.get(o.posted_by).company,
              job_role: posterMap.get(o.posted_by).job_role
            }
          : null
      }))
    });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
};

export const getOpportunityById = async (req, res) => {
  try {
    const db = getDb();
    const objectId = toObjectId(req.params.id);
    if (!objectId) return res.status(400).json({ error: 'Invalid opportunity id' });

    const opportunity = await db.collection('opportunities').findOne({ _id: objectId });
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });

    const serialized = serializeDoc(opportunity);
    const poster = await db.collection('users').findOne(
      { _id: toObjectId(serialized.posted_by) },
      { projection: USER_PROJECTION }
    );

    res.json({
      opportunity: {
        ...serialized,
        poster: poster
          ? {
              id: serializeDoc(poster).id,
              name: poster.name,
              email: poster.email,
              company: poster.company,
              job_role: poster.job_role
            }
          : null
      }
    });
  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
};

export const updateOpportunity = async (req, res) => {
  try {
    const db = getDb();
    const objectId = toObjectId(req.params.id);
    if (!objectId) return res.status(400).json({ error: 'Invalid opportunity id' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.posted_by;
    delete updates.created_at;
    updates.updated_at = new Date().toISOString();

    const opportunity = await db.collection('opportunities').findOne({ _id: objectId });
    if (!opportunity || opportunity.posted_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.collection('opportunities').updateOne({ _id: objectId }, { $set: updates });
    const updated = await db.collection('opportunities').findOne({ _id: objectId });
    res.json({ message: 'Opportunity updated', opportunity: serializeDoc(updated) });
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({ error: 'Failed to update opportunity' });
  }
};

export const deleteOpportunity = async (req, res) => {
  try {
    const db = getDb();
    const objectId = toObjectId(req.params.id);
    if (!objectId) return res.status(400).json({ error: 'Invalid opportunity id' });

    const opportunity = await db.collection('opportunities').findOne({ _id: objectId });
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
    if (opportunity.posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.collection('opportunities').deleteOne({ _id: objectId });
    res.json({ message: 'Opportunity deleted' });
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({ error: 'Failed to delete opportunity' });
  }
};

export const applyToOpportunity = async (req, res) => {
  try {
    const db = getDb();
    const objectId = toObjectId(req.params.opportunityId);
    if (!objectId) return res.status(400).json({ error: 'Invalid opportunity id' });

    const { resume_url } = req.body;
    const opportunity = await db.collection('opportunities').findOne({ _id: objectId, status: 'active' });
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found or closed' });

    const existing = await db.collection('applications').findOne({
      opportunity_id: req.params.opportunityId,
      applicant_id: req.user.id
    });
    if (existing) return res.status(400).json({ error: 'Already applied to this opportunity' });

    const doc = {
      opportunity_id: req.params.opportunityId,
      applicant_id: req.user.id,
      resume_url: resume_url || req.user.resume_url || null,
      status: 'applied',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await db.collection('applications').insertOne(doc);
    res.status(201).json({ message: 'Application submitted', application: serializeDoc({ _id: result.insertedId, ...doc }) });
  } catch (error) {
    console.error('Apply to opportunity error:', error);
    res.status(500).json({ error: 'Failed to apply' });
  }
};

export const getApplications = async (req, res) => {
  try {
    const db = getDb();
    const { opportunityId } = req.params;
    const opportunity = await db.collection('opportunities').findOne({ _id: toObjectId(opportunityId) });
    if (!opportunity || opportunity.posted_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const applications = await db.collection('applications')
      .find({ opportunity_id: opportunityId })
      .sort({ created_at: -1 })
      .toArray();

    const serializedApps = serializeDocs(applications);
    const applicantIds = serializedApps.map((a) => toObjectId(a.applicant_id)).filter(Boolean);
    const applicants = await db.collection('users').find({ _id: { $in: applicantIds } }, { projection: USER_PROJECTION }).toArray();
    const applicantMap = new Map(serializeDocs(applicants).map((u) => [u.id, u]));

    res.json({
      applications: serializedApps.map((a) => ({
        ...a,
        applicant: applicantMap.get(a.applicant_id)
          ? {
              id: applicantMap.get(a.applicant_id).id,
              name: applicantMap.get(a.applicant_id).name,
              email: applicantMap.get(a.applicant_id).email,
              branch: applicantMap.get(a.applicant_id).branch,
              batch_year: applicantMap.get(a.applicant_id).batch_year,
              skills: applicantMap.get(a.applicant_id).skills,
              resume_url: applicantMap.get(a.applicant_id).resume_url
            }
          : null
      }))
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const db = getDb();
    const { applicationId } = req.params;
    const { status } = req.body;
    if (!['applied', 'viewed', 'shortlisted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appObjectId = toObjectId(applicationId);
    if (!appObjectId) return res.status(400).json({ error: 'Invalid application id' });

    const application = await db.collection('applications').findOne({ _id: appObjectId });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const opportunity = await db.collection('opportunities').findOne({ _id: toObjectId(application.opportunity_id) });
    if (!opportunity || opportunity.posted_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.collection('applications').updateOne(
      { _id: appObjectId },
      { $set: { status, updated_at: new Date().toISOString() } }
    );

    const updated = await db.collection('applications').findOne({ _id: appObjectId });
    res.json({ message: 'Application status updated', application: serializeDoc(updated) });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const db = getDb();
    const applications = await db.collection('applications')
      .find({ applicant_id: req.user.id })
      .sort({ created_at: -1 })
      .toArray();

    const serialized = serializeDocs(applications);
    const opportunityIds = serialized.map((a) => toObjectId(a.opportunity_id)).filter(Boolean);
    const opportunities = await db.collection('opportunities').find({ _id: { $in: opportunityIds } }).toArray();
    const oppMap = new Map(serializeDocs(opportunities).map((o) => [o.id, o]));

    res.json({
      applications: serialized.map((a) => ({
        ...a,
        opportunity: oppMap.get(a.opportunity_id)
          ? {
              id: oppMap.get(a.opportunity_id).id,
              title: oppMap.get(a.opportunity_id).title,
              type: oppMap.get(a.opportunity_id).type,
              company: oppMap.get(a.opportunity_id).company,
              status: oppMap.get(a.opportunity_id).status
            }
          : null
      }))
    });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};