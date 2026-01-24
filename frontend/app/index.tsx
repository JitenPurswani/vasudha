import { Redirect } from "expo-router";
export default function Index(){
  const isFirstTime = true;
  if(isFirstTime){
    return <Redirect href="/(auth)/onboarding"/>;
  }
  return <Redirect href="/(main)/(tabs)/home"/>;
}