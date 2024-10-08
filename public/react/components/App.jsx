import React, { useContext } from "react";
import { AppContext } from "./AppContext";

import Auth from "./Auth";
import Profile from "./Profile";
import NavBar from "./NavBar";
import Prints from "./Prints";
import NewPrintForm from "./NewPrintForm";
import Search from "./Search";
import DeletePrint from "./DeletePrint";
import UpdatePrintForm from "./UpdatePrintForm";


function App() {
  const { 
    isSignedIn, 
    allPrintsView, 
    searchView, 
    addPrintView, 
    profileView, 
    allPrints, 
    handleSignInSubmit, 
    handleSignOut, 
    handlePrintClick, 
    allPrintsClick, 
    addPrintClick, 
    searchPrintsClick, 
    fetchPrints, 
    addPrint, 
    validateForm, 
    searchPrints, 
    deletePrints, 
    updatePrint, 
    fetchProfile, 
    updatePassword,
    profileViewClick
  } = useContext(AppContext); 
  
  return (
    <main>
      <NavBar handleSignOut={handleSignOut} profileViewClick={profileViewClick} />

      <DeletePrint 
        deletePrints={deletePrints} 
        allPrintsClick={allPrintsClick} 
      />
      <UpdatePrintForm 
        allPrintsClick={allPrintsClick} 
        updatePrint={updatePrint} 
        validateForm={validateForm}
        fetchPrints={fetchPrints}
      />

      {/* Show Menu When Signed In */}
      {isSignedIn ? (
        <div id="toggle-views">
          <button type="button" className="view-title" onClick={allPrintsClick}>
            All Prints
          </button>
          <button type="button" className="view-title" onClick={searchPrintsClick}>
            Search
          </button>
          <button type="button" className="view-title" onClick={addPrintClick}>
            Add Print
          </button>
        </div>
      ) : !isSignedIn && (
        // Show Sign In Form When Not Signed In
        <Auth />
      )}

      {/* Show All Prints When Signed In AND All Prints View is Toggled  */}
      {isSignedIn && allPrintsView ? (
        <Prints />
      ) : // Show Add Print Form When Signed In && Add Print view is Toggled
      isSignedIn && addPrintView ? (
        <NewPrintForm />
      ) : 
        // Show Search Bar When Signed In && Search View is Toggled
        isSignedIn && searchView ? (
          <Search />
        ) : 
        // Show Profile When Signed In & Profile View is Toggled
        isSignedIn && profileView && (
          <Profile />
      )}
    </main>
  );
}

export default App;