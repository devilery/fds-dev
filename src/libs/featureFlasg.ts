import Team from '../entity/Team'
import User from '../entity/User'

export interface IFeatureFlags {
    ci_checks?: boolean,
    ci_checks_notifications?: boolean,
    merge_button?: boolean
};

export default function isFeatureFlagEnabled(user: User, team: Team, feature_flag: keyof IFeatureFlags) {
    if (team.featureFlags[feature_flag]) return true;
    if (user.featureFlags[feature_flag]) return true;
    return false;
}