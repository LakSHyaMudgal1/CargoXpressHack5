import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  ActiveTrip: undefined;
  TripDetails: { tripId: string };
  MergeOffers: undefined;
  Profile: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type TripDetailsRouteProp = RouteProp<RootStackParamList, 'TripDetails'>;
